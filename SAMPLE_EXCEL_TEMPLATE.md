# Excel Upload Template

This document describes the required format for attendance Excel/CSV uploads.

## Required Format

### Option 1: Using `student_id`

| student_id | name       | lecture   |
|------------|------------|-----------|
| STU001     | John Doe   | Lecture 1 |
| STU002     | Jane Smith | Lecture 1 |
| STU003     | Bob Johnson| Lecture 1 |

### Option 2: Using `rfid_uid`

| rfid_uid | name       | lecture   |
|----------|------------|-----------|
| A1B2C3D4 | John Doe   | Lecture 1 |
| B2C3D4E5 | Jane Smith | Lecture 1 |
| C3D4E5F6 | Bob Johnson| Lecture 1 |

## Column Descriptions

### Required Columns
- **student_id** OR **rfid_uid** (one of these is required)
  - `student_id`: Student ID as stored in Student_Master table
  - `rfid_uid`: RFID UID as stored in Student_Master table

### Optional Columns
- **name**: Student name (for reference only)
- **lecture**: Lecture name/time (e.g., "Lecture 1", "Math", "9:00 AM")
- **date**: Date in YYYY-MM-DD format (if not provided, will use date from filename or upload form)

## File Naming

Recommended format:
- `YYYY-MM-DD_LectureName.xlsx` (e.g., `2025-11-03_Lecture1.xlsx`)
- `YYYY-MM-DD_LectureName.csv` (e.g., `2025-11-03_Lecture1.csv`)

The system will extract:
- **Date**: From filename or use upload form date
- **Lecture**: From filename or use upload form lecture field

## Example Files

### Example 1: Simple CSV
```csv
student_id,name,lecture
STU001,John Doe,Lecture 1
STU002,Jane Smith,Lecture 1
STU003,Bob Johnson,Lecture 1
```

### Example 2: Excel with Multiple Columns
```
student_id | name         | lecture   | date       | department
-----------|--------------|-----------|------------|------------
STU001     | John Doe     | Lecture 1 | 2025-11-03 | Computer
STU002     | Jane Smith   | Lecture 1 | 2025-11-03 | Computer
STU003     | Bob Johnson  | Lecture 1 | 2025-11-03 | IT
```

Note: Extra columns (like `department`) are ignored but don't cause errors.

## Processing Logic

1. System reads Excel/CSV file
2. Extracts date from filename or uses upload form date
3. Extracts lecture from filename or uses upload form lecture
4. For each student in file:
   - Looks up student in Student_Master by `student_id` or `rfid_uid`
   - Checks if student was scanned (in Entry_Log for that date)
   - Sets status:
     - **Present**: Scanned AND in Excel
     - **Proxy**: In Excel but NOT scanned
     - **Absent**: Not in Excel (handled via upload process)
     - **Bunk**: Scanned but NOT in Excel (added automatically)

## Troubleshooting

### Error: "Student not found"
- Ensure `student_id` or `rfid_uid` matches exactly with Student_Master table
- Check for leading/trailing spaces in Excel

### Error: "Invalid file format"
- Ensure file is `.xlsx`, `.xls`, or `.csv`
- Check file is not corrupted

### Error: "Missing required column"
- Ensure either `student_id` or `rfid_uid` column exists
- Column names are case-insensitive (Student_ID, STUDENT_ID both work)

## Best Practices

1. **Use consistent student IDs**: Match exactly with Student_Master table
2. **Include date in filename**: Makes it easier to track and process
3. **Use meaningful lecture names**: e.g., "Math_Lecture1", "Physics_9AM"
4. **Validate before upload**: Check student IDs exist in system
5. **Keep files organized**: Use consistent naming convention

