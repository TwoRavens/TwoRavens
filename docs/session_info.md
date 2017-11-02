
These notes relate to the use of saved workspaces.

## Session Data

(Tools already available in the application.)

- When a user first starts TwoRavens, the Django app creates a unique session key
- Calls to rook also use this *same* session key
- Under this key, the application can be directed to store arbitrary information in a python dictionary-like format.  
  - e.g. python dictionaries look like JSON and have no limit to nesting/depth
- The current application saves session data to the database in an encrypted text field.

## Session Length

- The user's browser stores a cookie containing the session key
- The session expiration can be set for an arbitrary length of time. Examples of cookie/session expiration time include:  
  - When the user closes the browser
  - 2 weeks (this is the default)
  - Any time, set in seconds: 1 year, 1 month, 2 days, 3 hours, 5 minutes, 45 seconds etc.
- The session cookie will also be cleared when the user manually clears his/her history

Note: They key is available on the browser but the data itself is stored on the server.


## Restoring upon refresh*
(* or going to another website and returning)

The basic session mechanism described above may be used for basic usability issues including:
  - Refreshing the page
  - Going to another page (e.g. login page) or another website and then returning

## Case 1: Dataverse domain

- Data to store in session

  - Session key
    - Workspace 1
      - data source
      - file state
        - transformations, etc
      - workspace state
        - selected variables: zdata


    - Data source 2

- When to save the data





  - The session starts when the user goes to the main workspace.
    - This can be changed, e.g. session can start when going to any page.
  - Calls to rook are given th
- what to save to restore a workspace
- when to save it
- how to save it
