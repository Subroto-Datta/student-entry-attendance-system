// Quick test to verify IST conversion
import { formatToIST, getTimeAgoIST } from './src/utils/timezone.js'

// Test UTC timestamps
const testTimestamps = [
  '2025-11-11T21:04:08Z', // 9:04 PM UTC
  '2025-11-11T15:00:00Z', // 3:00 PM UTC
  '2025-11-11T09:30:00Z', // 9:30 AM UTC
]

console.log('=== IST TIMEZONE CONVERSION TEST ===\n')

testTimestamps.forEach(utcTime => {
  const istTime = formatToIST(utcTime)
  const timeAgo = getTimeAgoIST(utcTime)
  
  console.log(`UTC:  ${utcTime}`)
  console.log(`IST:  ${istTime}`)
  console.log(`Ago:  ${timeAgo}`)
  console.log('---')
})

console.log('\nExpected Results:')
console.log('21:04:08 UTC → 02:34:08 IST (next day)')
console.log('15:00:00 UTC → 20:30:00 IST (same day)')
console.log('09:30:00 UTC → 15:00:00 IST (same day)')

