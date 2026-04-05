# Chat Message Management Design

## Overview

Add interactive message operations to the chat interface, including edit, delete, regenerate, and copy functionality for both user and AI messages.

## Data Structure

### ChatMessage Interface
```ts
interface ChatMessage {
  id: string;           // Unique message identifier
  role: "user" | "assistant";
  content: string;
  explanation?: string;
}
```

## Interaction Behavior

### Message Layout
- **User messages**: Right-aligned, blue background
- **AI messages**: Left-aligned, dark code block with explanation

### Button Display
- Buttons appear on hover at the bottom of each message
- User messages: buttons at bottom-right of message
- AI messages: buttons at bottom-left of message
- All messages show a copy button

### AI Message Operations (hover reveals)
- **Regenerate**: Only available on the **last** AI message in the conversation
- **Delete**: Deletes only that message; subsequent messages remain but are excluded from AI context

### User Message Operations (hover reveals)
- **Edit**: Enters edit mode, allowing user to modify content and resend
- **Delete**: Deletes only that message

### Copy Button
- Available on both user and AI messages
- Copies message content to clipboard

## Detailed Behaviors

### Edit and Resend (User Message)
When user edits a historical message and resends:

**Example**: A → B(AI) → C(user) → D(AI) → E(user) → F(AI)

User edits C and resends:
1. Delete D, E, F
2. Insert updated C as new user message
3. Call AI to generate response
4. Result: A → B(AI) → C'(user) → D'(AI)

### Regenerate (AI Message)
Only the **last** AI message can be regenerated. Clicking regenerate:

**Example**: A → B(AI) → C(user) → D(AI)

User clicks regenerate on D:
1. Delete D
2. Call AI to generate new response for C
3. Result: A → B(AI) → C(user) → D'(AI)

### Delete Message
- **AI message**: Removes that message only. Subsequent conversation (if any) remains visible but is excluded from AI context.
- **User message**: Removes that message only. Subsequent conversation remains visible but is excluded from AI context.

## UI Implementation

### Button Appearance
Each message shows small icon buttons on hover:
- User message: positioned at bottom-right
- AI message: positioned at bottom-left

### Button Icons
- Regenerate: 🔄 (rotating arrow)
- Delete: 🗑️ (trash can)
- Edit: ✏️ (pencil)
- Copy: 📋 (clipboard)

### Edit Mode
When user clicks edit on a message:
1. Message content transforms into a textarea
2. Confirm/Cancel buttons appear
3. Pressing Enter or clicking confirm triggers resend
4. Pressing Escape or clicking cancel reverts to original content

## Acceptance Criteria

1. Only the last AI message shows the regenerate button
2. Delete on any message removes only that message, not subsequent ones
3. Edit and resend on a user message removes all messages after it and regenerates AI response
4. All messages have a visible copy button on hover
5. Buttons appear on mouse hover and disappear when mouse leaves
