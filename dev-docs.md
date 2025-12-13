# Developer Documentation

## Database Schema
```ts
// Times stored as seconds since unix epoch
// Types are not nullable unless stated otherwise

users {
    id: int,
    name: string,
    email: string,
    password_hash: string,
    session_tokens: []string,
    // -1=suspended, 0=unverified, 1=verified
    status: int,
    rating: double,
    payment_types: []string,
    timestamp: int,
}

reviews {
    id: int,
    creator: int,
    about: int,
    rating: int,
    notes: string,
    timestamp: int,
}

offers {
    id: int,
    creator: int,
    pickupLocation: string,
    dropoffLocation: string,
    pickupTime: int,
    price: double,
    // passenger seat count; driver not included
    availableSeats: int,
    totalSeats: int,
    usersServing: []string,
    // 0=open
    status: int,
    notes: string,
    timestamp: int,
}

requests {
    id: int,
    creator: int,
    luggage: string,
    notes: string,
    pickup_location: string,
    dropoff_location: string,
    pickup_timerange_start: int,
    pickup_timerange_end: int,
    // 0=open
    status: INT,
    timestamp: int,
}
```

## Run Server
**Install Node JS**  
Get Node JS from [https://nodejs.org/en/download](https://nodejs.org/en/download)

**Install Git**  
Get Git from [https://git-scm.com/install/](https://git-scm.com/install/)

**Clone and enter Repository**  
`git clone https://github.com/vExcess/raven-drives.git`  
`cd raven-drives`

**Install dependencies**  
`npm install`

**Start server**  
`npm start`

## Setup Database
### Installation
The code snippets here assume a x64 Ubuntu 24.04 machine. From [https://www.mongodb.com/docs/manual/administration/install-community/](https://www.mongodb.com/docs/manual/administration/install-community/)

```sh
sudo apt-get install gnupg curl
```

```sh
curl -fsSL https://www.mongodb.org/static/pgp/server-8.0.asc | \
   sudo gpg -o /usr/share/keyrings/mongodb-server-8.0.gpg \
   --dearmor
```

```sh
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] https://repo.mongodb.org/apt/ubuntu noble/mongodb-org/8.2 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-8.2.list
```

```sh
sudo apt-get update
```

```sh
sudo apt-get install -y mongodb-org
```

MongoDB is now installed.

### Basic Configuration
Set MongoDB to run on startup
```sh
sudo systemctl enable mongod
```

Check if MongoDB is running
```sh
sudo systemctl status mongod
```

Manually start MongoDB (if not started already)
```sh
sudo systemctl start mongod
```

### Setup Authentication
Enter the mongo shell
```sh
mongosh
```

Switch to admin database
```sh
use admin
```

Create the admin user
```js
db.createUser({
    user: "admin",
    pwd: passwordPrompt(),
    roles: [
        { role: "userAdminAnyDatabase", db: "admin" },
        { role: "readWriteAnyDatabase", db: "admin" }
    ]
})
```

Create the project user
```js
db.createUser({
    user: "ravenDrivesUser",
    pwd: passwordPrompt(),
    roles: [
        { role: "readWrite", db: "ravenDrives" }
    ]
})
```

Exit the mongo shell
```sh
exit
```

Edit `/etc/mongod.conf` to have (You must open the file with root priveleges)
```yaml
security:
  authorization: enabled
```

Restart MongoDB after editing the conf file
```sh
sudo systemctl restart mongod
```

Now that the database uses authentication, to access the database via mongosh you will need to use the following commands. Note that `--authenticationDatabase` specifies which database to lookup the user's credentials in, not what database
you are trying to access.

To login as admin
```sh
mongosh -u admin -p --authenticationDatabase admin
```

To login as ravenDrivesUser
```sh
mongosh -u ravenDrivesUser -p --authenticationDatabase admin
```

## Setup MongoDB Compass (GUI for MongoDB)
### Installation
Download the .deb from [https://www.mongodb.com/try/download/compass](https://www.mongodb.com/try/download/compass)

Install it (file name may vary)
```
sudo dpkg -i mongodb-compass.deb
```

### Configure Connection
1) Start mongodb compass (Can be found in start menu, or alternatively run `mongodb-compass` in a terminal).
2) Click "Add new connection"
3) Set the Name field to `ravenDrivesUser` (can be whatever you want)
4) Click "Advanced Connection Options"
5) Click "Authentication"
6) Set the Username field to `ravenDrivesUser`
7) Set the Password field to the ravenDrivesUser's password
8) Set the Authentication Database field to `admin`
9) Click Save & Connect
10) Can you now click on the ravenDrives database in the sidebar on the left and browse the database and run queries