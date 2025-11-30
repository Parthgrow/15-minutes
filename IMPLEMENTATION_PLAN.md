# Implementation Plan: Adding Features Layer

## Overview

Add a three-level hierarchy: **Projects → Features → Tasks** (currently: Projects → Tasks)

## Current Structure

- Projects have Tasks directly
- Tasks reference `projectId`
- When switching to a project, only tasks are shown

## Target Structure

- Projects contain Features
- Features contain Tasks
- Tasks reference `featureId` (and `projectId` for backwards compatibility)
- When switching to a project, show all Features with their associated Tasks
- **Display Format**: Features numbered sequentially (1. abc, 2. cde)
- **Task Format**: Tasks numbered relative to their feature (1.1, 1.2 for feature 1; 2.1, 2.2 for feature 2)
- **Add Task Command**: `add task [description] [feature_id]` - explicitly specify feature ID

---

## Implementation Steps

### 1. Database Schema Changes (`lib/types.ts` & `lib/db.ts`)

#### 1.1 Add Feature Type

- Create `Feature` interface:
  ```typescript
  export interface Feature {
    id: string;
    projectId: string;
    name: string;
    createdAt: number;
    tasksCompleted: number;
  }
  ```

#### 1.2 Update Task Type

- Add `featureId: string` field to `Task` interface
- Keep `projectId` for backwards compatibility and easier queries
- Tasks will belong to both a Feature and a Project

#### 1.3 Database Migration

- Add `features` table to Dexie schema (version 2)
- Update `tasks` table index to include `featureId`
- Migration strategy:
  - Existing tasks will need a default feature or migration
  - Option: Create a "General" feature for each existing project and assign all tasks to it

#### 1.4 Database Helpers

Add to `dbHelpers`:

- `createFeature(projectId: string, name: string): Promise<Feature>`
- `getFeatures(projectId: string): Promise<Feature[]>` - Returns features ordered by creation (for sequential numbering)
- `getFeature(id: string): Promise<Feature | undefined>`
- `getFeatureByIndex(projectId: string, index: number): Promise<Feature | undefined>` - Get feature by its position (1-based)
- `incrementFeatureTasks(featureId: string): Promise<void>`
- Update `createTask()` to require both `projectId` and `featureId`
- Update `getTasks()` to filter by `featureId` (for backward compatibility, keep old signature)
- Add `getTasksByFeature(featureId: string): Promise<Task[]>` - Returns tasks for a specific feature
- Add `getTasksByProject(projectId: string): Promise<Task[]>` - Returns all tasks in a project (grouped by feature)
- Add `getOrCreateGeneralFeature(projectId: string): Promise<Feature>` - For migration of existing tasks

---

### 2. Command System Updates (`lib/commands.ts`)

#### 2.1 New Commands

- `new feature [name]` - Create a feature in the current project
  - Returns the feature with its sequential ID (e.g., "Created feature #2: [name]")
- `features` - List all features in the current project with their IDs
  - Format: `[1] Feature Name`, `[2] Another Feature`

#### 2.2 Updated Commands

- `add task [description] [feature_id]` - Add a task to a specific feature
  - Requires: active project context
  - Requires: feature_id (numeric, 1-based index)
  - Example: `add task "implement login" 1` (adds to feature #1)
  - Task will be auto-numbered relative to feature (e.g., 1.1, 1.2, 1.3)
  - Validation: Check if feature_id exists in current project
- `tasks` - Show all features with their tasks in hierarchical format
  - Format:
    ```
    [1] Feature Name
      [1.1] Task description
      [1.2] Another task
    [2] Another Feature
      [2.1] Task in feature 2
    ```
- `help` - Update to include feature commands with new syntax

#### 2.3 Command Context

- Keep `CommandContext` interface as is (no `currentFeatureId` needed)
- Feature selection is explicit via command argument (`add task [desc] [feature_id]`)
- Only `currentProjectId` is needed for context

---

### 3. UI Component Updates

#### 3.1 TaskList Component (`components/TaskList.tsx`)

**Major Refactor Required:**

- Change from showing flat list of tasks to showing Features with nested Tasks
- Display structure with sequential numbering:

  ```
  PENDING TASKS

  [1] Feature Name
    [1.1] Task description
    [1.2] Another task
  [2] Another Feature
    [2.1] Task in feature 2
    [2.2] Second task in feature 2
  ```

- **Numbering Logic**:
  - Features: Sequential based on creation order (1, 2, 3...)
  - Tasks: Relative to feature (1.1, 1.2 for feature 1; 2.1, 2.2 for feature 2)
- Props: Accept `projectId` (not `featureId`)
- Fetch all features for the project (ordered by `createdAt`)
- For each feature, fetch its pending tasks (ordered by `createdAt`)
- Calculate display numbers:
  - Feature number = index in sorted features array + 1
  - Task number = `${featureNumber}.${taskIndexInFeature + 1}`
- Group and display hierarchically with proper indentation
- Show empty features (features with no pending tasks) - can be collapsed or shown as `[1] Feature Name (no tasks)`

#### 3.2 ChatInterface Component (`components/ChatInterface.tsx`)

- No major changes needed (feature selection is explicit in command)
- Continue passing `currentProjectId` to command execution
- When project changes, TaskList will automatically refresh

#### 3.3 Main Page (`app/page.tsx`)

- No changes needed - only tracks `currentProjectId`
- Features are automatically shown when project is active

---

### 4. Data Migration Strategy

#### 4.1 Existing Data Handling

**Auto-migration Strategy (Confirmed)**

- On database version upgrade (v1 → v2):
  - Check for tasks without `featureId`
  - For each project with orphaned tasks:
    - Check if "General" feature already exists (by name)
    - If not, create a "General" feature for that project
    - Assign all orphaned tasks to this "General" feature
    - Preserve task creation order (so numbering stays consistent)
- Migration runs automatically on first load after update
- User sees their existing tasks under "General" feature

---

### 5. User Experience Flow

#### 5.1 Creating Features

1. User switches to a project: `switch [project name]`
2. User creates a feature: `new feature [name]`
3. Feature is created and assigned next sequential ID
4. Feature appears in TaskList immediately

#### 5.2 Adding Tasks

1. User must be in a project context
2. User runs: `add task [description] [feature_id]`
   - Example: `add task "implement login form" 1`
   - Feature ID is the sequential number shown in TaskList (1, 2, 3...)
3. System validates:
   - Project is active
   - Feature ID exists in current project
   - Returns error if invalid
4. Task is created and auto-numbered relative to feature (e.g., 1.1, 1.2, 1.3)
5. Task appears in TaskList under correct feature immediately

#### 5.3 Viewing Tasks

- When project is active, TaskList shows:
  - All features in that project (numbered 1, 2, 3...)
  - Under each feature, all pending tasks (numbered 1.1, 1.2, 2.1, 2.2...)
  - Visual hierarchy with indentation
  - Empty features are still shown (for reference)

---

### 6. Implementation Order

1. **Phase 1: Core Data Layer**

   - Add Feature type
   - Update Task type
   - Add database schema and helpers
   - Implement migration logic

2. **Phase 2: Command Layer**

   - Add feature commands
   - Update existing commands to work with features
   - Update command context

3. **Phase 3: UI Layer**

   - Update TaskList to show features and tasks
   - Update ChatInterface to handle feature context
   - Test the full flow

4. **Phase 4: Polish**
   - Handle edge cases
   - Improve error messages
   - Update help text
   - Test migration with existing data

---

## Design Decisions (Confirmed)

### Decision 1: Feature Selection Model ✅

**Explicit Feature ID in Command**

- User specifies feature ID directly: `add task [desc] [feature_id]`
- Feature IDs are sequential numbers (1, 2, 3...) shown in TaskList
- No need for feature switching or active feature state
- Clear and explicit - user always knows which feature they're adding to

### Decision 2: Task Display ✅

**Show all features and their tasks**

- When project is active, show all features
- Under each feature, show all pending tasks
- Numbering: Features (1, 2, 3...), Tasks (1.1, 1.2, 2.1, 2.2...)
- Empty features are shown (user can see all available features)

### Decision 3: Backwards Compatibility ✅

- Keep `projectId` on tasks - for easier queries and migration
- Migration: Auto-create "General" feature for existing tasks
- All existing tasks will be under "General" feature after migration

---

## Testing Checklist

- [ ] Create project → Create feature → Add task with feature ID → Verify task appears under correct feature
- [ ] Verify feature numbering (1, 2, 3...) is sequential
- [ ] Verify task numbering (1.1, 1.2, 2.1, 2.2...) is relative to feature
- [ ] Switch projects → Verify correct features/tasks shown
- [ ] Complete task → Verify it disappears from feature list
- [ ] Migration: Existing projects/tasks → Verify "General" feature created and tasks assigned
- [ ] Multiple features → Verify all shown correctly with proper numbering
- [ ] Empty features → Verify they still appear in list
- [ ] Add task with invalid feature ID → Verify error message
- [ ] Add task without project context → Verify error message
- [ ] Commands work correctly: `new feature`, `features`, `add task [desc] [id]`

---

## Files to Modify

1. `lib/types.ts` - Add Feature interface, update Task interface
2. `lib/db.ts` - Add features table, helpers, migration
3. `lib/commands.ts` - Add feature commands, update context
4. `components/TaskList.tsx` - Major refactor to show features + tasks
5. `components/ChatInterface.tsx` - Update context handling
6. `app/page.tsx` - Possibly add feature state (if needed)

---

## Estimated Complexity

- **Database Layer**: Medium (migration needed)
- **Command Layer**: Medium (new commands + context updates)
- **UI Layer**: Medium-High (hierarchical display)
- **Testing**: Medium (multiple scenarios)

**Total Estimated Time**: 2-3 hours for full implementation

---

## Key Implementation Details

### Numbering System

- **Feature Numbers**: Sequential based on creation order (1, 2, 3...)
  - Calculated at display time: `featureIndex + 1` in sorted features array
  - Stored in database: Features have `createdAt` for ordering
- **Task Numbers**: Relative to feature (1.1, 1.2, 2.1, 2.2...)
  - Format: `${featureNumber}.${taskIndexInFeature + 1}`
  - Calculated at display time based on feature's position and task's position within feature
  - Tasks ordered by `createdAt` within each feature

### Command Syntax Examples

```
> switch myproject
Switched to project: myproject

> new feature authentication
Created feature #1: authentication

> new feature dashboard
Created feature #2: dashboard

> add task "implement login" 1
Added task: implement login (1.1)

> add task "add OAuth" 1
Added task: add OAuth (1.2)

> add task "create dashboard UI" 2
Added task: create dashboard UI (2.1)

> features
Your features:
[1] authentication
[2] dashboard
```

### Display Example

```
PENDING TASKS (3)

[1] authentication
  [1.1] implement login
  [1.2] add OAuth
[2] dashboard
  [2.1] create dashboard UI
```

---

## Ready for Implementation ✅

All design decisions confirmed. Ready to proceed with implementation.
