/*
 * ESP32 RFID Attendance System - AWS Integration
 * 
 * This code reads RFID tags using RC522 module and sends entry logs
 * to AWS API Gateway endpoint for attendance tracking.
 * 
 * Hardware:
 * - ESP32 Development Board
 * - MFRC522 RFID Reader Module
 * - DS3231 RTC Module (for accurate timestamps)
 * - RFID Tags/Cards
 * - Buzzer (optional, for audio feedback)
 * 
 * Connections:
 * RC522    ESP32
 * SDA      GPIO 5
 * SCK      GPIO 18
 * MOSI     GPIO 23
 * MISO     GPIO 19
 * RST      GPIO 4
 * 3.3V     3.3V
 * GND      GND
 * 
 * DS3231 RTC:
 * SDA      GPIO 21 (I2C)
 * SCL      GPIO 22 (I2C)
 * VCC      5V or 3.3V
 * GND      GND
 * 
 * Buzzer:
 * +        GPIO 25
 * -        GND
 * 
 * Libraries Required:
 * - WiFi (built-in)
 * - HTTPClient (built-in)
 * - MFRC522 by GithubCommunity
 * - SPI (built-in)
 * - Wire (built-in)
 * - RTClib by Adafruit
 * 
 * Setup Instructions:
 * 1. Update WiFi credentials (ssid, password)
 * 2. Update API_GATEWAY_URL with your AWS API Gateway endpoint
 * 3. Upload code to ESP32
 * 4. Ensure RTC is set to correct time (auto-set on first run)
 * 5. Ensure students are registered in DynamoDB Student_Master table
 */

 #include <WiFi.h>
 #include <HTTPClient.h>
 #include <SPI.h>
 #include <MFRC522.h>
 #include <Wire.h>
 #include "RTClib.h"
 
 #define SS_PIN 5
 #define RST_PIN 4
 #define BUZZER_PIN 25
 
 // WiFi credentials
 const char* ssid = "AaryaB";
 const char* password = "aarya1234";
 
 // AWS API Gateway endpoint for entry logs
 // Replace with your actual API Gateway URL (e.g., https://YOUR-API-ID.execute-api.us-east-1.amazonaws.com/prod/entry)
 const char* API_GATEWAY_URL = "https://iz0fcerohk.execute-api.eu-north-1.amazonaws.com/prod/entry";
 
 MFRC522 rfid(SS_PIN, RST_PIN);
 RTC_DS3231 rtc;
 
 void setup() {
   Serial.begin(115200);
   Serial.println("=== RFID Attendance System - AWS Integration ===");
   Serial.println("Sends entry logs to AWS API Gateway /entry endpoint");
   delay(200);
 
   SPI.begin();
   rfid.PCD_Init();
 
   Wire.begin();
   if (!rtc.begin()) {
     Serial.println("Couldn't find RTC!");
   }
   if (rtc.lostPower()) {
     rtc.adjust(DateTime(F(__DATE__), F(__TIME__)));
   }
 
   pinMode(BUZZER_PIN, OUTPUT);
   digitalWrite(BUZZER_PIN, LOW);
 
   Serial.print("Connecting to WiFi: ");
   Serial.println(ssid);
   WiFi.mode(WIFI_STA);
   WiFi.begin(ssid, password);
 
   unsigned long start = millis();
   while (WiFi.status() != WL_CONNECTED) {
     if (millis() - start > 20000) {
       Serial.println("Failed to connect to WiFi (timeout). Continuing offline.");
       break;
     }
     delay(500);
     Serial.print(".");
   }
 
   if (WiFi.status() == WL_CONNECTED) {
     Serial.println();
     Serial.print("Connected, IP: ");
     Serial.println(WiFi.localIP());
   }
   Serial.println("Ready to scan RFID...");
 }
 
 void loop() {
   if (!rfid.PICC_IsNewCardPresent() || !rfid.PICC_ReadCardSerial()) {
     delay(50);
     return;
   }
 
   // Read RFID UID without spaces (format: A1B2C3D4)
   String rfidUid = "";
   for (byte i = 0; i < rfid.uid.size; i++) {
     if (rfid.uid.uidByte[i] < 0x10) rfidUid += "0";
     rfidUid += String(rfid.uid.uidByte[i], HEX);
   }
   rfidUid.toUpperCase();
 
   Serial.print("Card detected. RFID UID: ");
   Serial.println(rfidUid);
 
   // Get current timestamp from RTC
   DateTime now = rtc.now();
   String timestamp = getISOTimestamp(now);
   String date = getDateString(now);
 
   Serial.printf("Timestamp: %s, Date: %s\n", timestamp.c_str(), date.c_str());
 
   // Send entry log to AWS API Gateway
   if (WiFi.status() == WL_CONNECTED) {
     bool success = sendEntryLog(rfidUid, timestamp, date);
     if (success) {
       Serial.printf("✅ Entry log recorded successfully at %04d/%02d/%02d %02d:%02d:%02d\n",
                     now.year(), now.month(), now.day(),
                     now.hour(), now.minute(), now.second());
       successTune();
     } else {
       Serial.printf("❌ Failed to record entry log at %04d/%02d/%02d %02d:%02d:%02d\n",
                     now.year(), now.month(), now.day(),
                     now.hour(), now.minute(), now.second());
       failureTune();
     }
   } else {
     Serial.println("❌ No WiFi connection. Cannot send entry log.");
     Serial.println("Please connect to WiFi to use the attendance system.");
     failureTune();
   }
 
   rfid.PICC_HaltA();
   delay(1000); // Prevent duplicate scans
 }
 
 // --- SEND ENTRY LOG TO AWS API GATEWAY ---
 bool sendEntryLog(const String &rfidUid, const String &timestamp, const String &date) {
   HTTPClient http;
   
   // Prepare JSON payload
   String jsonPayload = "{";
   jsonPayload += "\"rfid_uid\":\"" + rfidUid + "\",";
   jsonPayload += "\"timestamp\":\"" + timestamp + "\",";
   jsonPayload += "\"date\":\"" + date + "\"";
   jsonPayload += "}";
 
   Serial.println("Sending entry log to API Gateway...");
   Serial.println("URL: " + String(API_GATEWAY_URL));
   Serial.println("Payload: " + jsonPayload);
 
   if (http.begin(API_GATEWAY_URL)) {
     http.addHeader("Content-Type", "application/json");
     
     int httpCode = http.POST(jsonPayload);
     String response = "";
     
     if (httpCode > 0) {
       response = http.getString();
       Serial.printf("HTTP Response code: %d\n", httpCode);
       Serial.println("Response: " + response);
       
       if (httpCode == 200) {
         // Parse JSON response to check if it was successful
         if (response.indexOf("\"message\"") >= 0 || response.indexOf("successfully") >= 0) {
           http.end();
           return true;
         } else if (response.indexOf("\"error\"") >= 0) {
           Serial.println("API returned error: " + response);
           http.end();
           return false;
         }
         http.end();
         return true; // 200 status code means success
       } else {
         Serial.printf("HTTP Error: %d\n", httpCode);
         http.end();
         return false;
       }
     } else {
       Serial.printf("HTTP POST failed, code: %d\n", httpCode);
       Serial.println("Error: " + http.errorToString(httpCode));
       http.end();
       return false;
     }
   } else {
     Serial.println("Failed to connect to API Gateway.");
     return false;
   }
 }
 
// --- GENERATE ISO TIMESTAMP FROM RTC ---
String getISOTimestamp(DateTime dt) {
  // RTC is set to IST (UTC+5:30), so we need to convert to UTC for proper storage
  // Subtract 5 hours and 30 minutes to get UTC time
  DateTime utcTime = DateTime(dt.unixtime() - 19800); // 19800 seconds = 5.5 hours
  
  // Format: YYYY-MM-DDTHH:MM:SSZ (UTC format)
  char timestamp[25];
  sprintf(timestamp, "%04d-%02d-%02dT%02d:%02d:%02dZ",
          utcTime.year(), utcTime.month(), utcTime.day(),
          utcTime.hour(), utcTime.minute(), utcTime.second());
  return String(timestamp);
}
 
// --- GENERATE DATE STRING ---
String getDateString(DateTime dt) {
  // Use IST date (RTC is in IST)
  // Format: YYYY-MM-DD
  char date[11];
  sprintf(date, "%04d-%02d-%02d",
          dt.year(), dt.month(), dt.day());
  return String(date);
}
 
 // --- BUZZER TUNES ---
 void successTune() {
   for (int i = 0; i < 2; i++) {
     digitalWrite(BUZZER_PIN, HIGH); delay(100);
     digitalWrite(BUZZER_PIN, LOW); delay(60);
   }
   delay(80);
   digitalWrite(BUZZER_PIN, HIGH); delay(280);
   digitalWrite(BUZZER_PIN, LOW);
 }
 
 void failureTune() {
   digitalWrite(BUZZER_PIN, HIGH); delay(420);
   digitalWrite(BUZZER_PIN, LOW); delay(120);
   digitalWrite(BUZZER_PIN, HIGH); delay(180);
   digitalWrite(BUZZER_PIN, LOW);
 }