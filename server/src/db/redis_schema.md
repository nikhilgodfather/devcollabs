# DevCollab Redis Key Schema

## 1. Real-Time User Presence
**Key**: `devcollab:workspace:{workspace_id}:presence`
**Type**: Hash
**Field**: `{socket_id}`
**Value**: JSON `{ "userId": "...", "username": "...", "cursor": { "line": 1, "ch": 5 }, "status": "online" }`

## 2. Workspace Metadata Cache
**Key**: `devcollab:cache:workspace:{workspace_id}`
**Type**: String (JSON)
**TTL**: 1 hour

## 3. Member Role Cache
**Key**: `devcollab:cache:workspace:{workspace_id}:roles`
**Type**: Hash
**Field**: `{user_id}`
**Value**: Role String (`OWNER`, `COLLABORATOR`, `VIEWER`)
**TTL**: 15 mins

## 4. Job Status
**Key**: `devcollab:jobs:{job_id}`
**Type**: String
**Value**: Status String (`PENDING`, `PROCESSING`, , `COMPLETED` ,`DONE`)
**TTL**: 24 hours

## 5. Pub/Sub Channels
**Channel**: `devcollab:updates:workspace:{workspace_id}`
**Payload**: Real-time event objects
