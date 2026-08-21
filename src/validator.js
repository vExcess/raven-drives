const Ajv = require("ajv");

const ajv = new Ajv({ allErrors: false });

const name = {
    type: "string",
    pattern: /^[a-zA-Z0-9\. ]{2,}$/,
    minLength: 2,
    maxLength: 50
};

const email = {
    type: "string",
    pattern: /^[a-zA-Z0-9\.]{6,}@(ravens\.benedictine\.edu|benedictine\.edu)$/,
    minLength: 17,
    maxLength: 50
};

const password = {
    type: "string",
    minLength: 8,
    maxLength: 64
};

function compileAjvValidator(props, allRequired) {
    for (const fieldName in props) {
        const field = props[fieldName];
        if (typeof field.pattern === "object") {
            field.pattern = field.pattern.toString();
            field.pattern = field.pattern.slice(1, field.pattern.length - 1);
        }
    }

    return ajv.compile({
        type: "object",
        properties: props,
        required: allRequired ? Object.keys(props) : [],
        additionalProperties: false
    });
}

// was previously using AJV, but I figured for our use case
// it's easy enough to just write a custom validator generator
// function and avoid importing an additional dependency.
function compileValidator(props, allRequired) {
    function validator(json) {
        validator.errors = [];

        if (!json || typeof json !== "object") {
            validator.errors = ["Invalid JSON object"];
            return false;
        }

        const expectedFieldsCount = Object.keys(props).length;
        const recievedFieldsCount = Object.keys(json).length;
        if (allRequired && recievedFieldsCount !== expectedFieldsCount) {
            validator.errors = [`Incorrect number of fields supplied: recieved ${recievedFieldsCount}; expected ${expectedFieldsCount}`];
            return false;
        }

        if (!allRequired) {
            for (const key in props) {
                const restrictions = props[key];
                if (restrictions.required && !(key in json)) {
                    validator.errors = [`Missing required field: ${key}`];
                    return false;
                }
            }
        }

        for (const key in json) {
            const value = json[key];
            const restrictions = props[key];

            if (!restrictions) {
                validator.errors = [`Invalid key name: ${key}`];
                return false;
            }

            if (typeof value !== restrictions.type) {
                validator.errors = [`Incorrect type for ${key}: expected ${restrictions.type}; recieved ${typeof value}`];
                return false;
            }

            if (restrictions.type === "string") {
                if (restrictions.minLength !== undefined && value.length < restrictions.minLength) {
                    validator.errors = [`${key} must be at least ${restrictions.minLength} characters long`];
                    return false;
                }
                if (restrictions.maxLength !== undefined && value.length > restrictions.maxLength) {
                    validator.errors = [`${key} must NOT be more than ${restrictions.maxLength} characters long`];
                    return false;
                }
                if (restrictions.pattern !== undefined && !restrictions.pattern.test(value)) {
                    validator.errors = [`${key} failed to match the pattern ${restrictions.pattern}`];
                    return false;
                }
            }

            if (restrictions.type === "number") {
                if (restrictions.min !== undefined && value < restrictions.min) {
                    validator.errors = [`${key} must be at least ${restrictions.min}`];
                    return false;
                }
                if (restrictions.max !== undefined && value > restrictions.max) {
                    validator.errors = [`${key} must NOT be more than ${restrictions.max}`];
                    return false;
                }
            }
        }

        return true;
    }
    validator.errors = [];
    return validator;
}

const userLogin = compileValidator({ email, password }, true);

const userSignup = compileValidator({ name, email, password }, true);

const addOffer = compileValidator({
    pickup_location: {
        type: "string",
        minLength: 1,
        maxLength: 64,
        required: true
    },
    dropoff_location: {
        type: "string",
        minLength: 1,
        maxLength: 64,
        required: true
    },
    pickup_time: {
        type: "number",
        min: 1,
        required: true
    },
    dropoff_time: {
        type: "number",
        min: 1,
        required: true
    },
    price: {
        type: "number",
        min: 0,
        required: true
    },
    total_seats: {
        type: "number",
        min: 1,
        required: true
    },
    notes: {
        type: "string",
        maxLength: 500,
        required: false
    }
});

const addRequest = compileValidator({
    pickup_location: {
        type: "string",
        minLength: 1,
        maxLength: 64,
        required: true
    },
    dropoff_location: {
        type: "string",
        minLength: 1,
        maxLength: 64,
        required: true
    },
    pickup_timerange_start: {
        type: "number",
        min: 1,
        required: true
    },
    pickup_timerange_end: {
        type: "number",
        min: 1,
        required: true
    },
    price: {
        type: "number",
        min: 0,
        required: false
    },
    notes: {
        type: "string",
        maxLength: 500,
        required: false
    }
});

const viewOffersQuery = compileValidator({
    pickup_location: {
        type: "string",
        minLength: 0,
        maxLength: 64
    },
    dropoff_location: {
        type: "string",
        minLength: 0,
        maxLength: 64
    },
    pickup_time_start: {
        type: "string",
        minLength: 0,
        maxLength: 64,
        pattern: /^[0-9]+$/
    },
    pickup_time_end: {
        type: "string",
        minLength: 0,
        maxLength: 64,
        pattern: /^[0-9]+$/
    },
    dropoff_time_start: {
        type: "string",
        minLength: 0,
        maxLength: 64,
        pattern: /^[0-9]+$/
    },
    dropoff_time_end: {
        type: "string",
        minLength: 0,
        maxLength: 64,
        pattern: /^[0-9]+$/
    },
    open: {
        type: "string",
        minLength: 4,
        maxLength: 5,
    },
    closed: {
        type: "string",
        minLength: 4,
        maxLength: 5,
    }
});

const updateRequestPrice = compileValidator({
    request_id: {
        type: "string",
        minLength: 1,
        maxLength: 64,
        required: true
    },
    price: {
        type: "number",
        min: 0,
        required: true
    }
});

const updateOfferAvailableSeats = compileValidator({
    offer_id: {
        type: "string",
        minLength: 1,
        maxLength: 64,
        required: true
    },
    available_seats: {
        type: "number",
        min: 0,
        required: true
    }
});

const updateOfferNotes = compileValidator({
    offer_id: {
        type: "string",
        minLength: 1,
        maxLength: 64,
        required: true
    },
    notes: {
        type: "string",
        maxLength: 500,
        required: true
    }
});

const updateRequestNotes = compileValidator({
    request_id: {
        type: "string",
        minLength: 1,
        maxLength: 64,
        required: true
    },
    notes: {
        type: "string",
        maxLength: 500,
        required: true
    }
});

const viewRequestsQuery = compileValidator({
    pickup_location: {
        type: "string",
        minLength: 0,
        maxLength: 64
    },
    dropoff_location: {
        type: "string",
        minLength: 0,
        maxLength: 64
    },
    pickup_timerange_start: {
        type: "string",
        minLength: 0,
        maxLength: 64,
        pattern: /^[0-9]+$/
    },
    pickup_timerange_end: {
        type: "string",
        minLength: 0,
        maxLength: 64,
        pattern: /^[0-9]+$/
    },
    open: {
        type: "string",
        minLength: 4,
        maxLength: 5,
        // pattern: /^true|false$/
    },
    closed: {
        type: "string",
        minLength: 4,
        maxLength: 5,
        // pattern: /^true|false$/
    }
});

module.exports = {
    userLogin,
    userSignup,
    addOffer,
    addRequest,
    updateRequestPrice,
    updateOfferAvailableSeats,
    updateOfferNotes,
    updateRequestNotes,
    viewOffersQuery,
    viewRequestsQuery
};