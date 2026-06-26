# Pre-Release Clearance Checklist - System Architecture

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     API LAYER (Controllers)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ReleaseApprovalController        ReleaseClearanceChecklistController
│  - POST /release/approval ──┐     - POST /clearance-checklist
│  - GET /release/approval    │     - GET /clearance-checklist/{id}
│  - DELETE /release/{id}     │     - POST /clearance-checklist/clear-item
│                             │     - PUT /clearance-checklist/{id}/complete
│                             │     - GET /clearance-checklist/{id}/status
│                             │
│                             ▼
├─────────────────────────────────────────────────────────────────┤
│                   REQUEST VALIDATION LAYER                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ApproveReleaseRequest ◄─────  InitiateClearanceChecklistRequest │
│  CancelReleaseRequest           ClearChecklistItemRequest        │
│                                 CompleteClearanceChecklistRequest│
│
│
├─────────────────────────────────────────────────────────────────┤
│                    SERVICE LAYER (Business Logic)                │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ReleaseService ◄───────────── ReleaseClearanceService          │
│  ├─ approveRelease() ──────┐    ├─ initiateClearanceChecklist()  │
│  ├─ confirmRelease()       │    ├─ clearItem()                   │
│  ├─ cancelRelease()        │    ├─ unclearItem()                 │
│  └─ getEligibleInmates()   ├───►├─ completeChecklist()           │
│                            │    ├─ isChecklistFullyCleared()     │
│                            │    ├─ getClearanceStatus()          │
│                            │    └─ validateClearanceForApproval()│
│                            │
│                            ▼
│                [VALIDATION CHECK POINT]
│           "All clearances completed before approval"
│
│
├─────────────────────────────────────────────────────────────────┤
│                   REPOSITORY LAYER (Data Access)                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ReleaseWorkflowRepository    ReleaseClearanceRepository        │
│  ├─ createApproval()          ├─ createChecklist()              │
│  ├─ updateToConfirmed()       ├─ createChecklistItems()         │
│  ├─ findById()                ├─ getChecklistById()             │
│  └─ findActiveByAdmission()   ├─ markItemCleared()              │
│                               ├─ markItemUncleared()            │
│                               ├─ completeChecklist()            │
│                               └─ getCompletionPercentage()      │
│
│
├─────────────────────────────────────────────────────────────────┤
│                    MODEL LAYER (Domain Objects)                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ReleaseWorkflow (1) ◄──── (1) ReleaseClearanceChecklist        │
│  ├─ admission_id             ├─ release_workflow_id             │
│  ├─ status                   ├─ admission_id                    │
│  ├─ approved_by              ├─ initiated_by                    │
│  ├─ approved_at              ├─ initiated_at                    │
│  ├─ confirmed_by             ├─ completed_by                    │
│  ├─ confirmed_at             ├─ completed_at                    │
│  ├─ cancelled_by             ├─ all_items_cleared               │
│  ├─ cancelled_at             └─ (7) ReleaseClearanceChecklistItem
│  └─ cancellation_reason          ├─ item_type                   │
│                                  ├─ item_label                  │
│                                  ├─ is_cleared                  │
│                                  ├─ cleared_by                  │
│                                  ├─ cleared_at                  │
│                                  └─ verification_notes          │
│
│
├─────────────────────────────────────────────────────────────────┤
│                      DATABASE LAYER (Tables)                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  release_workflow                    release_clearance_checklists │
│  release_clearance_checklist_items                               │
│
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow: Release Approval with Clearance

```
User Request
    │
    ▼
┌─────────────────────────────────────────────┐
│ POST /api/release/approval                  │
│ { admission_id: 5, notes: "..." }           │
└────────────┬────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────┐
│ ApproveReleaseRequest Validation            │
│ ✓ admission_id exists                       │
│ ✓ User has station_officer role             │
└────────────┬────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────┐
│ ReleaseService.approveRelease()             │
│ 1. Load eligible admission                  │
│ 2. Check no active workflow exists          │
│ 3. Validate clearance ◄────┐                │
└────────────┬────────────────┼────────────────┘
             │                │
             │                ▼
             │   ┌──────────────────────────────┐
             │   │ ReleaseClearanceService      │
             │   │ .validateClearanceForApproval()
             │   │                              │
             │   │ 1. Get checklist by admission│
             │   │    (Latest non-cancelled)    │
             │   │                              │
             │   │ 2. Check checklist exists    │
             │   │    ❌ Throw if not           │
             │   │                              │
             │   │ 3. Check all items cleared   │
             │   │    ❌ Throw if incomplete    │
             │   │                              │
             │   │ 4. Return true if valid      │
             │   └────────┬─────────────────────┘
             │            │
             │            ▼
             │   Query ReleaseClearanceRepository
             │   .getChecklistByAdmission(id)
             │            │
             │            ▼
             │   Query Database
             │   SELECT * FROM release_clearance_checklists
             │   WHERE admission_id = ? 
             │   ORDER BY id DESC
             │
             ├─── If checklist incomplete:
             │    return 422 Unprocessable Entity
             │    { error: "Not all clearance items verified" }
             │
             └─── If clearance valid:
                     ▼
    ┌──────────────────────────────────────────┐
    │ ReleaseWorkflowRepository                │
    │ .createApproval()                        │
    │ INSERT INTO release_workflow             │
    └────────────┬─────────────────────────────┘
                 │
                 ▼
    ┌──────────────────────────────────────────┐
    │ Event: ReleaseApproved                   │
    │ Dispatch for notifications/logging       │
    └────────────┬─────────────────────────────┘
                 │
                 ▼
    ┌──────────────────────────────────────────┐
    │ Return 201 Created                       │
    │ { data: ReleaseWorkflow object }         │
    └──────────────────────────────────────────┘
```

## Clearance Item Workflow

```
┌──────────────────────────────────────────────────┐
│ ReleaseApprovalController.store()                │
│ ❌ Approval fails: No clearance checklist        │
└──────────────────────────────────────────────────┘
         │
         │ User initiates clearance
         ▼
┌──────────────────────────────────────────────────┐
│ POST /api/release/clearance-checklist            │
│ { release_workflow_id: 1, admission_id: 5 }     │
└────────────┬─────────────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────────────┐
│ ReleaseClearanceChecklistController.store()      │
│ Initiates checklist with 7 items                │
│ Status: 0% complete                             │
└────────────┬─────────────────────────────────────┘
             │
             ├─ Department 1                       ├─ Department 2
             │  POST /api/release/clearance-checklist/clear-item
             │  { checklist_item_id: 1,            │  { checklist_item_id: 3,
             │    verification_notes: "..." }      │    verification_notes: "..." }
             │                                     │
             ▼                                     ▼
    ┌────────────────┐                    ┌────────────────┐
    │ Item 1 Cleared │  ✓ 14%             │ Item 3 Cleared │  ✓ 28%
    │ By: Officer A  │                    │ By: Doctor B   │
    └────────────────┘                    └────────────────┘
             │                                     │
             └─────────────┬───────────────────────┘
                           │
                    Continue clearing...
                           │
                           ▼
    ┌─────────────────────────────────────────────┐
    │ GET /api/release/clearance-checklist/{id}   │
    │ Status: 100% complete (7/7 items)           │
    │ all_items_cleared: true                     │
    └─────────────────────────────────────────────┘
                           │
                           ▼
    ┌─────────────────────────────────────────────┐
    │ PUT /api/release/clearance-checklist/{id}/complete
    │ Mark checklist as completed                 │
    │ Event: ClearanceChecklistCompleted          │
    └────────────┬────────────────────────────────┘
                 │
                 ▼
    ┌─────────────────────────────────────────────┐
    │ NOW: Release approval can proceed           │
    │ POST /api/release/approval                  │
    │ ✓ Clearance validation passes               │
    │ ✓ Release workflow created with status      │
    │   "approved"                                │
    └─────────────────────────────────────────────┘
```

## Role-Based Access Control

```
┌─────────────────────────────────────────────────────────────┐
│                    CLEARANCE OPERATIONS                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ Operation              │ Station Officer │ Gatekeeper │ Other│
│ ───────────────────────┼─────────────────┼────────────┼──────│
│ Initiate Checklist     │      ✓          │     ✗      │  ✗   │
│ View Checklist         │      ✓          │     ✓      │  ✗   │
│ Clear Item             │      ✓          │     ✓      │  ✗   │
│ Unclear Item           │      ✓          │     ✗      │  ✗   │
│ Complete Checklist     │      ✓          │     ✗      │  ✗   │
│ Get Status             │      ✓          │     ✓      │  ✗   │
│ Get Available Items    │      ✓          │     ✓      │  ✗   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## State Transitions

```
                    Initial State
                         │
                         ▼
        ┌────────────────────────────┐
        │  Clearance Checklist       │
        │  Initiated                 │
        │  (0/7 items cleared)       │
        │  all_items_cleared = false │
        └────────────┬───────────────┘
                     │
              (clearing items)
                     │
                     ▼
        ┌────────────────────────────┐
        │  Items Being Cleared       │
        │  (1/7, 2/7, ..., 6/7)      │
        │  all_items_cleared = false │
        └────────────┬───────────────┘
                     │
            (last item cleared)
                     │
                     ▼
        ┌────────────────────────────┐
        │  All Items Cleared         │
        │  (7/7 items cleared)       │
        │  all_items_cleared = false │
        │  (awaiting completion)     │
        └────────────┬───────────────┘
                     │
        (complete checklist endpoint)
                     │
                     ▼
        ┌────────────────────────────┐
        │  Checklist Completed       │
        │  (7/7 items cleared)       │
        │  all_items_cleared = true  │
        │  completed_at = timestamp  │
        │  completed_by = user_id    │
        └────────────────────────────┘
                     │
    (approval proceeds without errors)
                     │
                     ▼
        ┌────────────────────────────┐
        │  Release Approved          │
        │  (Release Workflow)        │
        │  status = "approved"       │
        └────────────────────────────┘
```

## Event System

```
┌─────────────────────────────────────┐
│ ClearanceChecklistInitiated         │
├─────────────────────────────────────┤
│ Fired: When checklist created       │
│ Data: Checklist object              │
│ Use: Send notifications, logging    │
│ Listeners: Could notify departments │
└─────────────────────────────────────┘
         │
         ▼ (Multiple items cleared by various departments)
         
┌─────────────────────────────────────┐
│ [No event for individual items]     │
│ (Could add if needed for tracking)  │
└─────────────────────────────────────┘
         │
         ▼ (All items cleared)
         
┌─────────────────────────────────────┐
│ ClearanceChecklistCompleted         │
├─────────────────────────────────────┤
│ Fired: When all items cleared       │
│ Data: Checklist object              │
│ Use: Send notifications, auto-flow  │
│ Listeners: Could trigger            │
│           auto-approval or          │
│           route to next stage       │
└─────────────────────────────────────┘
```

## Key Integration Points

### 1. Pre-Approval Validation
```php
// In ReleaseService::approveRelease()
$this->clearanceService->validateClearanceForApproval($admissionId);
// Throws RuntimeException if:
// - No clearance checklist exists
// - Not all items are cleared
```

### 2. Controller Authorization
```php
// Request classes enforce role checks
$user->hasRole('station_officer')  // For initiation, completion
$user->hasRole('gatekeeper')        // For viewing, clearing items
```

### 3. Audit Trail
```
Each cleared item records:
- Who cleared it (user_id)
- When it was cleared (timestamp)
- What notes they provided (verification_notes)
- Complete history in database
```

