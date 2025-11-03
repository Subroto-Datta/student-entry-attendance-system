/*
 * ESP32 RFID Attendance System
 * 
 * This code reads RFID tags using RC522 module and sends entry logs
 * to AWS API Gateway endpoint.
 * 
 * Hardware:
 * - ESP32 Development Board
 * - MFRC522 RFID Reader Module
 * - RFID Tags/Cards
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
 * Libraries Required:
 * - WiFi (built-in)
 * - HTTPClient (built-in)
 * - MFRC522 by GithubCommunity
 * - SPI (built-in)
 * 
 * Install MFRC522 library:
 * Sketch -> Include Library -> Manage Libraries -> Search "MFRC522" -> Install
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <SPI.h>
#include <MFRC522.h>

// WiFi Credentials
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// AWS API Gateway Endpoint
// Replace with your actual API Gateway URL
const char* apiGatewayUrl = "https://YOUR-API-ID.execute-api.us-east-1.amazonaws.com/prod/entry";

// RFID Module Pins
#define SS_PIN    5   // SDA
#define RST_PIN   4   // RST

// Initialize MFRC522
MFRC522 mfrc522(SS_PIN, RST_PIN);

// Timing variables
unsigned long lastScanTime = 0;
const unsigned long scanInterval = 2000; // 2 seconds between scans

void setup() {
  Serial.begin(115200);
  delay(1000);

  // Initialize SPI for RFID
  SPI.begin();
  mfrc522.PCD_Init();
  
  Serial.println("RFID Reader Initialized");
  
  // Connect to WiFi
  connectToWiFi();
  
  Serial.println("System Ready. Please scan RFID tag...");
}

void loop() {
  // Check if a card is present
  if (!mfrc522.PICC_IsNewCardPresent()) {
    delay(500);
    return;
  }

  // Select the card
  if (!mfrc522.PICC_ReadCardSerial()) {
    delay(500);
    return;
  }

  // Prevent duplicate scans within interval
  unsigned long currentTime = millis();
  if (currentTime - lastScanTime < scanInterval) {
    return;
  }
  lastScanTime = currentTime;

  // Read RFID UID
  String rfidUid = "";
  for (byte i = 0; i < mfrc522.uid.size; i++) {
    if (mfrc522.uid.uidByte[i] < 0x10) rfidUid += "0";
    rfidUid += String(mfrc522.uid.uidByte[i], HEX);
    rfidUid.toUpperCase();
  }

  Serial.print("RFID UID: ");
  Serial.println(rfidUid);

  // Get current timestamp
  String timestamp = getCurrentTimestamp();
  String date = getCurrentDate();

  // Send to AWS API Gateway
  sendEntryLog(rfidUid, timestamp, date);

  // Halt card to prevent multiple reads
  mfrc522.PICC_HaltA();
  mfrc522.PCD_StopCrypto1();
  
  delay(1000);
}

void connectToWiFi() {
  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);
  
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.println("WiFi Connected!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println();
    Serial.println("WiFi Connection Failed!");
    Serial.println("System will retry in 10 seconds...");
    delay(10000);
    connectToWiFi(); // Retry
  }
}

String getCurrentTimestamp() {
  // Get current time from NTP or use system time
  // For simplicity, using formatted string
  // In production, use NTP client library for accurate time
  
  time_t now = time(nullptr);
  struct tm timeinfo;
  
  if (!getLocalTime(&timeinfo)) {
    // Fallback: use millis() to generate timestamp
    return "2025-01-01T00:00:00Z";
  }
  
  char timestamp[25];
  strftime(timestamp, sizeof(timestamp), "%Y-%m-%dT%H:%M:%SZ", &timeinfo);
  return String(timestamp);
}

String getCurrentDate() {
  // Get current date
  time_t now = time(nullptr);
  struct tm timeinfo;
  
  if (!getLocalTime(&timeinfo)) {
    return "2025-01-01";
  }
  
  char date[11];
  strftime(date, sizeof(date), "%Y-%m-%d", &timeinfo);
  return String(date);
}

void sendEntryLog(String rfidUid, String timestamp, String date) {
  // Check WiFi connection
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected. Reconnecting...");
    connectToWiFi();
    return;
  }

  HTTPClient http;
  
  // Prepare JSON payload
  String payload = "{";
  payload += "\"rfid_uid\":\"" + rfidUid + "\",";
  payload += "\"timestamp\":\"" + timestamp + "\",";
  payload += "\"date\":\"" + date + "\"";
  payload += "}";

  Serial.println("Sending to API Gateway...");
  Serial.println("URL: " + String(apiGatewayUrl));
  Serial.println("Payload: " + payload);

  // Configure HTTP client
  http.begin(apiGatewayUrl);
  http.addHeader("Content-Type", "application/json");
  
  // Send POST request
  int httpResponseCode = http.POST(payload);

  // Check response
  if (httpResponseCode > 0) {
    Serial.print("HTTP Response code: ");
    Serial.println(httpResponseCode);
    
    String response = http.getString();
    Serial.println("Response: " + response);
    
    if (httpResponseCode == 200) {
      Serial.println("Entry log sent successfully!");
    } else {
      Serial.println("Error: API returned non-200 status");
    }
  } else {
    Serial.print("Error sending request: ");
    Serial.println(httpResponseCode);
    Serial.println("Error description: " + http.errorToString(httpResponseCode));
  }

  http.end();
}

// Optional: NTP Time Configuration (for accurate timestamps)
// Uncomment and configure if you need precise timestamps

/*
#include <time.h>

const char* ntpServer = "pool.ntp.org";
const long gmtOffset_sec = 0;  // Adjust for your timezone (e.g., 19800 for IST)
const int daylightOffset_sec = 0;

void setupNTP() {
  configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);
  Serial.println("NTP configured");
  
  // Wait for time to be set
  struct tm timeinfo;
  while (!getLocalTime(&timeinfo)) {
    delay(1000);
    Serial.println("Waiting for NTP sync...");
  }
  
  Serial.println("Time synchronized");
}
*/

