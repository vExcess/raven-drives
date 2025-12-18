const Ajv = require("ajv");

const ajv = new Ajv({ allErrors: false });

const name = {
    type: "string",
    pattern: "^[a-zA-Z0-9\\. ]{2,}",
    minLength: 2,
    maxLength: 50
};

const email = {
    type: "string",
    pattern: "^[a-zA-Z0-9\\.]{6,}@(ravens\\.benedictine\\.edu|benedictine\\.edu)",
    minLength: 17,
    maxLength: 50
};

const password = {
    type: "string",
    minLength: 8,
    maxLength: 64
};

function compileValidator(props) {
    return ajv.compile({
        type: "object",
        properties: props,
        required: Object.keys(props),
        additionalProperties: false
    });
}

const userLogin = compileValidator({ email, password });

const userSignup = compileValidator({ name, email, password });

module.exports = {
    userLogin,
    userSignup
};