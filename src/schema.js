const bson = require("bson");

// just copy the schemas string from dev-docs.md
const SCHEMAS_STRING = `
users {
    id: string,
    name: string,
    email: string,
    password_hash: string,
    salt: long,
    session_tokens: []string,
    verification_codes: []string,
    // -1=suspended, 0=unverified, 1=verified
    status: int,
    rating: double,
    payment_types: []string,
    timestamp: int,
}

reviews {
    id: string,
    creator: int,
    about: int,
    rating: int,
    notes: string,
    timestamp: int,
}

offers {
    id: string,
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
    id: string,
    creator: string,
    notes: string,
    pickup_location: string,
    dropoff_location: string,
    pickup_timerange_start: int,
    pickup_timerange_end: int,
    price: double,
    // 0=open
    status: int,
    timestamp: int,
}`;

// Since JS doesn't have different number datatypes,
// to make things easy for ourselves map the database
// types to JS types
const typeMappings = {
    "string": "string",
    "long": "number",
    "int": "number",
    "double": "number",
};

/*
    string => {
        users: [][]string,
        reviews: [][]string,
        offers: [][]string,
        requests: [][]string,
    }
*/
function parseSchemas(schemas) {
    let parsedSchemas = {};
    schemas
        .split("\n\n") // split into collections
        .forEach(s => {
            s = s.trim();
            const collectionKey = s.slice(0, s.indexOf(" "));
            const values = s
                .slice(s.indexOf("{") + 1, s.indexOf("}"))
                .split("\n")
                .map(s2 => s2.trim())
                .filter(s2 => s2.length > 0 && !s2.startsWith("//"))
                .map(s2 => s2.endsWith(",") ? s2.slice(0, s2.length - 1) : s2)
                .map(s2 => {
                    const valueKey = s2.slice(0, s2.indexOf(":"));
                    const typeKey = s2.slice(s2.indexOf(":") + 1).trim();
                    return [valueKey, typeMappings[typeKey] ?? typeKey];
                });
            parsedSchemas[collectionKey] = values;
        });
    return parsedSchemas;
}

const schemas = parseSchemas(SCHEMAS_STRING);

function mongodbTypeFromParsed(keyTypePair, isArrayItemType) {
    const valueKey = keyTypePair[0];
    const valueType = keyTypePair[1];

    if (valueType.startsWith("[]")) {
        return {
            bsonType: "array",
            items: mongodbTypeFromParsed([valueKey, valueType.slice(2)], true),
            description: `${valueKey} must be of type ${valueType}`
        };
    } else if (isArrayItemType) {
        return {
            bsonType: valueType
        };
    } else {
        return {
            bsonType: valueType,
            description: `${valueKey} must be of type ${valueType}`
        };
    }
}

function mongodbValidatorFromParsed(parsed) {
    let validator = {
        $jsonSchema: {
            bsonType: "object",
            required: parsed.map(arr => arr[0]),
            properties: {}
        }
    };

    parsed.forEach(keyTypePair => {
        const valueKey = keyTypePair[0];
        validator.$jsonSchema.properties[valueKey] = mongodbTypeFromParsed(keyTypePair);
    });

    return validator;
}

module.exports = {
    parsedSchemas: schemas,
    mongodbValidatorFromParsed
}