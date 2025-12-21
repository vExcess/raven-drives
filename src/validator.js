const Ajv = require("ajv");

const ajv = new Ajv({ allErrors: false });

const name = {
    type: "string",
    pattern: /^[a-zA-Z0-9\. ]{2,}/,
    minLength: 2,
    maxLength: 50
};

const email = {
    type: "string",
    pattern: /^[a-zA-Z0-9\.]{6,}@(ravens\.benedictine\.edu|benedictine\.edu)/,
    minLength: 17,
    maxLength: 50
};

const password = {
    type: "string",
    minLength: 8,
    maxLength: 64
};

function compileAjvValidator(props) {
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
        required: Object.keys(props),
        additionalProperties: false
    });
}

// was previously using AJV, but I figured for our use case
// it's easy enough to just write a custom validator generator
// function and avoid importing an additional dependency.
function compileValidator(props) {
    function validator(json) {
        const expectedFieldsCount = Object.keys(props).length;
        const recievedFieldsCount = Object.keys(json).length;
        if (recievedFieldsCount !== expectedFieldsCount) {
            validator.errors = [`Incorrect number of fields supplied: recieved ${recievedFieldsCount}; expected ${expectedFieldsCount}`];
            return false;
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
                    validator.errors = [`${key} must NOT be more than ${restrictions.minLength} characters long`];
                    return false;
                }
                if (restrictions.pattern !== undefined && !restrictions.pattern.test(value)) {
                    validator.errors = [`${key} failed to match the pattern ${restrictions.pattern}`];
                    return false;
                }
            }
        }

        return true;
    }
    validator.errors = [];
    return validator;
}

const userLogin = compileValidator({ email, password });

const userSignup = compileValidator({ name, email, password });

module.exports = {
    userLogin,
    userSignup
};