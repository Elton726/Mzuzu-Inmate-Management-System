# Pre-Release Clearance Checklist Feature

## Overview

The Pre-Release Clearance Checklist is a critical feature that ensures all necessary security and administrative checks are completed before an inmate is approved for release. This feature introduces a mandatory checklist that must be fully cleared before the release can proceed to approval.

## Clearance Items

The system includes 7 mandatory clearance items:

1. **Warrant Verified** - Confirm that the inmate's warrant has been verified and is valid
2. **No Pending Court Order** - Verify there are no pending court orders preventing release
3. **No Outstanding Disciplinary Case** - Confirm no active disciplinary cases exist
4. **Medical Clearance** - Ensure medical department has cleared the inmate for release
5. **Property Returned** - Verify all personal property has been returned to the inmate
6. **Activity/Program Exit Completed** - Confirm the inmate has exited all assigned activities and programs
7. **Next-of-Kin Notified** - Verify that next-of-kin have been notified of the release

## Workflow

### 1. Initiate Clearance Checklist

**Endpoint:** `POST /api/release/clearance-checklist`

**Request:**
```json
{
  "release_workflow_id": 1,
  "admission_id": 5
}
```

**Response (201):**
```json
{
  "message": "Clearance checklist initiated successfully.",
  "data": {
    "checklist_id": 1,
    "workflow_id": 1,
    "admission_id": 5,
    "total_items": 7,
    "cleared_items": 0,
    "pending_items": 7,
    "completion_percentage": 0,
    "all_cleared": false,
    "is_fully_cleared": false,
    "initiated_at": "2026-06-25T10:30:00Z",
    "completed_at": null,
    "items": [
      {
        "id": 1,
        "type": "warrant_verified",
        "label": "Warrant Verified",
        "is_cleared": false,
        "cleared_at": null,
        "cleared_by": null,
        "verification_notes": null
      },
      // ... other items
    ]
  }
}
```

### 2. Clear Individual Items

**Endpoint:** `POST /api/release/clearance-checklist/clear-item`

**Request:**
```json
{
  "checklist_item_id": 1,
  "verification_notes": "Warrant verified and valid until 2026-12-31"
}
```

**Response:**
```json
{
  "message": "Checklist item marked as cleared.",
  "data": {
    "success": true
  }
}
```

### 3. Get Clearance Status

**Endpoint:** `GET /api/release/clearance-checklist/{checklistId}/status`

**Response:**
```json
{
  "data": {
    "checklist_id": 1,
    "workflow_id": 1,
    "admission_id": 5,
    "total_items": 7,
    "cleared_items": 5,
    "pending_items": 2,
    "completion_percentage": 71,
    "all_cleared": false,
    "is_fully_cleared": false,
    "initiated_at": "2026-06-25T10:30:00Z",
    "completed_at": null,
    "items": [
      {
        "id": 1,
        "type": "warrant_verified",
        "label": "Warrant Verified",
        "is_cleared": true,
        "cleared_at": "2026-06-25T10:35:00Z",
        "cleared_by": "John Doe",
        "verification_notes": "Warrant verified and valid"
      },
      // ... other items
    ]
  }
}
```

### 4. Complete Clearance Checklist

**Endpoint:** `PUT /api/release/clearance-checklist/{checklistId}/complete`

**Note:** This endpoint can only be called when ALL items are cleared.

**Response:**
```json
{
  "message": "Clearance checklist completed successfully.",
  "data": {
    "checklist_id": 1,
    "workflow_id": 1,
    "admission_id": 5,
    "total_items": 7,
    "cleared_items": 7,
    "pending_items": 0,
    "completion_percentage": 100,
    "all_cleared": true,
    "is_fully_cleared": true,
    "initiated_at": "2026-06-25T10:30:00Z",
    "completed_at": "2026-06-25T11:00:00Z"
  }
}
```

### 5. Get Checklist by Workflow

**Endpoint:** `GET /api/release/clearance-checklist/workflow/{workflowId}`

**Response:** Same as status endpoint

## Integration with Release Approval

The clearance checklist is **mandatory** before release approval:

1. When a station officer attempts to approve a release via `POST /api/release/approval`, the system will:
   - Check if a clearance checklist exists for the admission
   - Verify that all items are cleared
   - If checks fail, return a 422 error with the reason

2. Example error response:
```json
{
  "error": "Not all clearance items have been verified. Please complete all items before approval."
}
```

## Authorization

- **Clearance Item Clearing:** station_officer, gatekeeper
- **Checklist Initiation:** station_officer
- **Checklist Completion:** station_officer
- **Viewing Clearance:** station_officer, gatekeeper

## Events

The system dispatches the following events:

### ClearanceChecklistInitiated
- Fired when a new clearance checklist is created
- Includes checklist data and initiator information

### ClearanceChecklistCompleted
- Fired when all items are cleared and the checklist is completed
- Includes checklist data and completer information

## Database Schema

### release_clearance_checklists
```
- id (PK)
- release_workflow_id (FK)
- admission_id (FK)
- initiated_by (FK to users)
- initiated_at (timestamp)
- completed_by (FK to users, nullable)
- completed_at (timestamp, nullable)
- all_items_cleared (boolean)
- created_at, updated_at
```

### release_clearance_checklist_items
```
- id (PK)
- clearance_checklist_id (FK)
- item_type (string)
- item_label (string)
- is_cleared (boolean)
- cleared_by (FK to users, nullable)
- cleared_at (timestamp, nullable)
- verification_notes (text, nullable)
- created_at, updated_at
```

## Example Complete Workflow

```
1. Officer views eligible inmates for release
   GET /api/release/approval

2. Officer selects an inmate and initiates clearance
   POST /api/release/clearance-checklist
   {
     "release_workflow_id": 1,
     "admission_id": 5
   }

3. Various departments verify and clear items
   POST /api/release/clearance-checklist/clear-item
   {
     "checklist_item_id": 1,
     "verification_notes": "..."
   }
   ... (repeat for other items)

4. Officer checks clearance status
   GET /api/release/clearance-checklist/1/status

5. Once all items are cleared, officer completes the checklist
   PUT /api/release/clearance-checklist/1/complete

6. Officer approves the release (now passes validation)
   POST /api/release/approval
   {
     "admission_id": 5,
     "notes": "Approved for release"
   }

7. On release date, gatekeeper confirms the release
   PUT /api/release/confirmation/1
   {
     "notes": "Inmate released"
   }
```

## Error Handling

### Common Errors

**404 Not Found**
```json
{
  "error": "Clearance checklist not found."
}
```

**422 Unprocessable Entity**
```json
{
  "error": "Cannot complete checklist with uncleared items."
}
```

**422 Unprocessable Entity (on approval)**
```json
{
  "error": "No clearance checklist found for this admission. Please initiate the clearance process first."
}
```

## Best Practices

1. **Early Initiation:** Initiate the clearance checklist as soon as it's decided that an inmate is eligible for release
2. **Detailed Notes:** Always include verification notes when clearing items for audit trail
3. **Parallel Processing:** Multiple departments can work on clearing items simultaneously
4. **Status Monitoring:** Regularly check the status to identify bottlenecks
5. **Audit Trail:** All clearing actions are logged with user, timestamp, and notes

