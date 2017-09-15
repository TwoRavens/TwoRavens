## Initial/Prototype Error Handling

- Requests to consider: 
  - `StartSession`
  - `UpdateProblemSchema`
  - `PipelineCreateRequest`

Which errors do you want to handle?  How do you want to handle them?  

## Level 1 (before message is sent to TA2)

1. JSON string doesn't convert to gRPC message
    - **Needed**: What should the user message be?  
      - We can log the more technical message but what message should to go the UI
      - This should be rare but I just did it by accident and it could potentially happen.  Depending on the call types (beyond startSession), at least some of the JSON will be prepared in the UI.

## Level 2 (server is down): 
   - We could retry to connect.
      - If so, how many attempts should we make over what time period?
      - Or should we ask the user to try again in a few seconds?
      - Thinking of the possibility where TA2 is not ready but TA3 is--even if the lag is a moment
   - **Needed**: What do you want passed back to the UI?

## Level 3 (TA2 sends back message with a bad status code):

Part of this may simply be handled in the UI. Should we ask our TA2 partners for a list of what to expect?

   - In what cases do we simply pass the responses back to the UI?
   - **Needed**: A case of a `StartSession` that fails for being the wrong grpc version, we should either:
     - warn the user and keep going or
     - inform the user and stop the app
   - What other conditions may occur from `UpdateProblemSchema` and `PipelineCreateRequest`
