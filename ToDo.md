# To-Do
List of what we need to do, and if it's done.

## In Progress
    [ ] Data sanitization
        [ ] Verify that all input fulfills field requirements
        [ ] prevent Regex DOS attacks on DB queries
        [ ] prevent queries from reading more data from db than allowed
            - for MongDB this means validating that input is of type string instead of object (part of verifying input matches field requirements)
        [ ] prevent XSS attacks on the client
            - use `<%=` where appropriate in EJS templates
            - use `escape()` when setting .innerHTML
        - ensure db queries can't overwrite existing data that it shouldn't

## Important ToDos
    [ ] Application Functionality
        [ ] Home Page
            - stylize ride stats to be better on mobile (desktop too idealy)
    [ ] Add a page for users to see their open requests/offers and edit them or mark them as claimed/full
    [ ] Auto move claimed/full/expired requests/offers to a database for archival and analysis
    [ ] Unarchive requests/offers when users unmark them as claimed/full if something changes, but only allow users to do this (as well as edit) before the pickup date, so that users don't just edit the same offer over and over which would throw off our results
    [ ] 
    [ ] make login and signup pages redirect if already signed in?

    [ ] Accessability
        [ ] Ensure every page functions well on both desktop and mobile

    [ ] Security
        [ ] encrypt sensitive data (passwords + salts)
        [ ] use DNS over HTTPS/Encrypted Client Hello
        - make sure we are using cryptography primitives correctly
        - do not use a MongoDB version that is vulnerable to the recent MongoBleed attack

    [ ] Reliability
        [ ] Ensure the service stays available even if the server encounters internal errors (proper error handling)
        [ ] Create a database backup system that we can restore from in case of emergency
            a. 3 copies, 2 mediums, 1 stored offsite

    [ ] Performance enhancements
        [ ] Cache content on client where reasonable
        [ ] Create MongoDB indexes to increase query performance
        [ ] Create in-memory cache for frequently queried things
    
    [ ] Compression
        [ ] Minimize HTML/JS/CSS being sent to client to save bandwidth
        [ ] Setup GZIP or Brotli compression for in-transit requests to save bandwidth
        - Users will be using the app on cellular data or slow airport WiFi. We want to minimize bandwidth so the application is snappy even with very poor internet connections.

    [ ] Capture analytics data to present on discovery day

## Less Important ToDos
    [ ] New Logo

    [ ] Let users put notes on their requests/offers

    [ ] Potentially migrate to MySQL/MariaDB or Postgres 
        - the IT department has experience with MySQL so it would make hosting easier for them

## Done
Move stuff to this section once it's no longer relevant

    [x] Make To-Do List
