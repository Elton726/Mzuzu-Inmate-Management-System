# Pre-Release Clearance Checklist - Quick Reference Guide

## 📋 What Was Added

### New Feature: Pre-Release Clearance Checklist
A mandatory 7-item security checklist that must be completed before any inmate release is approved.

---

## 🎯 Quick Start (For Developers)

### 1. Run Migrations
```bash
php artisan migrate
```

### 2. Test the API

#### Initiate Clearance Checklist
```bash
curl -X POST http://localhost:8000/api/release/clearance-checklist \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "release_workflow_id": 1,
    "admission_id": 5
  }'
```

#### Clear an Item
```bash
curl -X POST http://localhost:8000/api/release/clearance-checklist/clear-item \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "checklist_item_id": 1,
    "verification_notes": "Warrant verified and valid"
  }'
```

#### Get Clearance Status
```bash
curl -X GET http://localhost:8000/api/release/clearance-checklist/1/status \
  -H "Authorization: Bearer TOKEN"
```

#### Complete Checklist
```bash
curl -X PUT http://localhost:8000/api/release/clearance-checklist/1/complete \
  -H "Authorization: Bearer TOKEN"
```

#### Approve Release (now requires clearance)
```bash
curl -X POST http://localhost:8000/api/release/approval \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "admission_id": 5,
    "notes": "Release approved after full clearance"
  }'
```

---

## 📁 Files Structure

```
app/Modules/Release/
├── Models/
│   ├── ReleaseClearanceChecklist.php          [NEW]
│   ├── ReleaseClearanceChecklistItem.php      [NEW]
│   └── ReleaseWorkflow.php                    [MODIFIED]
├── Services/
│   ├── ReleaseClearanceService.php            [NEW]
│   └── ReleaseService.php                     [MODIFIED]
├── Repositories/
│   ├── ReleaseClearanceRepository.php         [NEW]
│   └── ReleaseWorkflowRepository.php
├── Controllers/Api/
│   ├── ReleaseClearanceChecklistController.php [NEW]
│   └── ReleaseApprovalController.php
├── Requests/
│   ├── InitiateClearanceChecklistRequest.php  [NEW]
│   ├── ClearChecklistItemRequest.php          [NEW]
│   ├── CompleteClearanceChecklistRequest.php  [NEW]
│   └── ApproveReleaseRequest.php
├── Events/
│   ├── ClearanceChecklistInitiated.php        [NEW]
│   ├── ClearanceChecklistCompleted.php        [NEW]
│   └── ReleaseApproved.php
├── Enums/
│   └── ClearanceItemType.php                  [NEW]
├── CLEARANCE_CHECKLIST_API.md                 [NEW]
├── IMPLEMENTATION_NOTES.md                    [NEW]
└── SYSTEM_ARCHITECTURE.md                     [NEW]

database/migrations/
└── 2026_06_25_000000_create_release_clearance_checklist_tables.php [NEW]
```

---

## 🔑 Key Classes & Methods

### ReleaseClearanceService
```php
// Initiate checklist with 7 default items
initiateClearanceChecklist(int $workflowId, int $admissionId, int $initiatedBy)

// Clear individual item
clearItem(int $itemId, int $clearedBy, ?string $notes = null)

// Mark as uncleared (revert)
unclearItem(int $itemId)

// Finalize checklist (after all items cleared)
completeChecklist(int $checklistId, int $completedBy)

// Check if all items cleared
isChecklistFullyCleared(int $checklistId)

// Get detailed status
getClearanceStatus(int $checklistId)

// Validate before approval (integration point)
validateClearanceForApproval(int $admissionId)
```

### ReleaseClearanceChecklistController
```php
// POST /api/release/clearance-checklist
store(Request $request)

// GET /api/release/clearance-checklist/{checklistId}
show(int $checklistId)

// GET /api/release/clearance-checklist/workflow/{workflowId}
byWorkflow(int $workflowId)

// POST /api/release/clearance-checklist/clear-item
clearItem(Request $request)

// POST /api/release/clearance-checklist/unclear-item
unclearItem(Request $request)

// PUT /api/release/clearance-checklist/{checklistId}/complete
complete(Request $request, int $checklistId)

// GET /api/release/clearance-checklist/{checklistId}/status
status(int $checklistId)

// GET /api/release/clearance-checklist/available-items
availableItems()
```

---

## 🔐 Authorization Rules

| Operation | Station Officer | Gatekeeper | Others |
|-----------|:---------------:|:----------:|:------:|
| Initiate Checklist | ✓ | ✗ | ✗ |
| View Checklist | ✓ | ✓ | ✗ |
| Clear Items | ✓ | ✓ | ✗ |
| Unclear Items | ✓ | ✗ | ✗ |
| Complete Checklist | ✓ | ✗ | ✗ |
| Approve Release | ✓ | ✗ | ✗ |

---

## 📊 Database Tables

### release_clearance_checklists
- Stores checklist records
- Links release_workflow to clearance process
- Tracks who initiated and who completed it
- Records completion status and timestamp

### release_clearance_checklist_items
- Individual items (7 per checklist)
- Tracks cleared status for each item
- Records who cleared it and when
- Stores verification notes

---

## 🎨 Clearance Items

```php
'warrant_verified' => 'Warrant Verified'
'no_pending_court_order' => 'No Pending Court Order'
'no_disciplinary_case' => 'No Outstanding Disciplinary Case'
'medical_clearance' => 'Medical Clearance'
'property_returned' => 'Property Returned'
'program_exit_completed' => 'Activity/Program Exit Completed'
'next_of_kin_notified' => 'Next-of-Kin Notified'
```

---

## 🎯 Error Scenarios

### ❌ Approve without clearance
```json
{
  "error": "No clearance checklist found for this admission. Please initiate the clearance process first."
}
```

### ❌ Approve with incomplete clearance
```json
{
  "error": "Not all clearance items have been verified. Please complete all items before approval."
}
```

### ❌ Complete with uncleared items
```json
{
  "error": "Cannot complete checklist with uncleared items."
}
```

### ❌ Clearance already exists for workflow
```json
{
  "error": "A clearance checklist already exists for this release workflow."
}
```

---

## 🚀 Integration Points

### 1. In ReleaseService
```php
public function approveRelease(...) 
{
    // New validation happens here
    $this->clearanceService->validateClearanceForApproval($admissionId);
    
    // Rest of approval logic...
}
```

### 2. Events
```php
// When checklist initiated
event(new ClearanceChecklistInitiated($checklist, $userId));

// When all items cleared
event(new ClearanceChecklistCompleted($checklist, $userId));
```

---

## 📝 Common Workflows

### Complete Clearance Flow
```
1. Officer initiates clearance
2. Various departments clear their items
3. All items reach 100% completion
4. Officer completes checklist
5. Officer approves release
6. Gatekeeper confirms on release date
```

### Audit Trail Example
```
Item: "Warrant Verified"
├─ Cleared By: John Doe (Officer)
├─ Cleared At: 2026-06-25 10:35:00
└─ Notes: "Warrant valid until 2026-12-31. No issues."
```

---

## ⚠️ Important Notes

1. **Mandatory**: All 7 items MUST be cleared before approval
2. **No Bypass**: There's no way to skip clearance validation
3. **Immutable**: Once completed, cannot be reopened
4. **Audit Trail**: All actions logged with user and timestamp
5. **Multi-User**: Different departments can clear different items simultaneously

---

## 🧪 Testing Checklist

- [ ] Initiate clearance checklist
- [ ] Clear individual items with notes
- [ ] View clearance status (0%, 50%, 100%)
- [ ] Complete checklist (all items cleared)
- [ ] Approve release (now passes validation)
- [ ] Verify audit trail in database
- [ ] Test unauthorized access (non-authorized roles)
- [ ] Test duplicate checklist creation (should fail)
- [ ] Test incomplete approval attempt (should fail)

---

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| CLEARANCE_CHECKLIST_API.md | Complete API endpoints documentation |
| IMPLEMENTATION_NOTES.md | Technical implementation details |
| SYSTEM_ARCHITECTURE.md | System design and data flows |
| QUICK_REFERENCE.md | This file - quick lookup guide |

---

## 🔍 How to Debug

### Check Clearance Status
```bash
# Get current status
GET /api/release/clearance-checklist/{id}/status

# Response shows:
# - completion_percentage
# - pending_items
# - which items are not cleared
# - notes from cleared items
```

### Database Queries
```sql
-- Check checklist for an admission
SELECT * FROM release_clearance_checklists 
WHERE admission_id = 5;

-- Check individual items and status
SELECT * FROM release_clearance_checklist_items 
WHERE clearance_checklist_id = 1 
ORDER BY id;

-- Check who cleared what and when
SELECT item_label, cleared_by, cleared_at, verification_notes 
FROM release_clearance_checklist_items 
WHERE clearance_checklist_id = 1 AND is_cleared = true;
```

---

## 🎓 Learning Path

1. Start: Read CLEARANCE_CHECKLIST_API.md (API usage)
2. Then: Read IMPLEMENTATION_NOTES.md (what was built)
3. Then: Read SYSTEM_ARCHITECTURE.md (how it works)
4. Finally: Explore the code in app/Modules/Release/

---

## 🤝 Contributing

When adding features to clearance system:
1. Add new item types to ClearanceItemType enum
2. Update ReleaseClearanceChecklistItem::getAvailableTypes()
3. Add validation rules in ReleaseClearanceService
4. Update API documentation
5. Add test cases

---

## 📞 Support

For questions about the clearance feature:
1. Check CLEARANCE_CHECKLIST_API.md for endpoint details
2. Check IMPLEMENTATION_NOTES.md for technical details
3. Check SYSTEM_ARCHITECTURE.md for data flows
4. Review the code in app/Modules/Release/

---

**Last Updated:** 2026-06-25  
**Feature Status:** ✅ Complete and Ready for Testing

