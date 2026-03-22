# NextFlow Testing Checklist

## Latest Validation Notes

- Status values: `PASS` / `FAIL` / `PENDING`
- Keep this section updated after each end-to-end test pass.
- 1. Text -> LLM: `PENDING`
- 2. LLM manual input: `PENDING`
- 3. Upload Image -> Crop Image: `PENDING`
- 4. Upload Video -> Extract Frame: `PENDING`
- 5. Parallel branch -> LLM merge: `PENDING`
- 6. Missing required connection failure: `PENDING`
- 7. Invalid timestamp failure: `PENDING`
- 8. Re-run consistency: `PENDING`
- 9. Single-node run: `PENDING`
- 10. Load/perf sanity: `PENDING`

## 1. Text -> LLM (baseline)
- Setup:
  - Add `Text` node with: `Write 2 lines about testing pipelines`
  - Add `Run LLM` node
  - Connect `Text.output -> LLM.user_message`
- Expected:
  - `llm-task` runs once in Trigger logs
  - LLM node shows output text
  - Run ends `SUCCESS`
- Validate:
  - `GET /api/runs/{runId}` has `nodeResult.status = SUCCESS` and `output.text`

## 2. LLM with manual input only (no edge)
- Setup:
  - Add only `Run LLM`
  - Fill `manualUserMessage`
  - Run
- Expected:
  - LLM succeeds without incoming `user_message` edge
  - Output appears in node
- Validate:
  - `inputs` may be empty; `output.text` is present

## 3. Upload Image -> Crop Image
- Setup:
  - Upload valid image
  - Add crop values (ex: x/y/w/h = 10/10/80/80)
  - Connect `UploadImage.output -> CropImage.image_url`
- Expected:
  - `crop-image-task` executes
  - Crop node output is a URL
  - Run `SUCCESS`
- Validate:
  - `nodeResult.output.url` exists and is reachable

## 4. Upload Video -> Extract Frame
- Setup:
  - Upload short mp4
  - Set timestamp `2` or `50%`
  - Connect `UploadVideo.output -> ExtractFrame.video_url`
- Expected:
  - `extract-frame-task` executes
  - Extract node output is image URL
- Validate:
  - `nodeResult.output.url` exists and returns an image

## 5. Parallel branch -> LLM merge
- Setup:
  - Branch A: `Text A -> LLM.user_message`
  - Branch B: `Upload Image -> Crop Image -> LLM.images`
  - Optional: `Text B -> LLM.system_prompt`
- Expected:
  - Upstream nodes complete first
  - LLM runs after dependencies
  - Final output uses text + image context
- Validate:
  - LLM `inputs` includes `user_message` and `images`

## 6. Failure path: missing required connection
- Setup:
  - Add `Crop Image` without `image_url` edge
  - Run
- Expected:
  - Clear error (`Missing required input: image_url`)
  - Run status `FAILED` or `PARTIAL`
- Validate:
  - `nodeResult.error` is populated
  - Spinner stops, error visible in node

## 7. Failure path: invalid timestamp
- Setup:
  - Video flow, set `Extract Frame.timestamp = abc%z`
- Expected:
  - Task fails safely with clear validation error
- Validate:
  - `nodeResult.error` contains invalid timestamp message
  - No crash/hang

## 8. Re-run consistency
- Setup:
  - Run same workflow 3 times
- Expected:
  - New `runId` each time
  - Outputs refresh each run
  - No stuck `Running...`
- Validate:
  - Trigger logs show separate runs
  - `GET /api/runs?workflowId=...` returns runs ordered by `createdAt desc`

## 9. Single-node run button
- Setup:
  - Workflow with multiple nodes
  - Click node-level run on one node
- Expected:
  - `scope = SINGLE`
  - Only selected node executes
  - UI updates from polling and exits running state
- Validate:
  - Run record has `scope: SINGLE` and one `nodeId`

## 10. Load/perf sanity
- Setup:
  - 6-10 nodes with at least 2 parallel branches
  - Run once
- Expected:
  - Finishes in reasonable time
  - No deadlock
- Validate:
  - `workflow-execution-task` ends `SUCCESS`/`PARTIAL`
  - All node results reach terminal state

## Inspecting Results
- UI:
  - Node result/error text
  - Running/success/error badge
- Trigger logs:
  - Task timeline and durations
- API:
  - `GET /api/runs?workflowId=<id>`
  - `GET /api/runs/<runId>`
- Database tables:
  - `WorkflowRun`
  - `NodeResult`
