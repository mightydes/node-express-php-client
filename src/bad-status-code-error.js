class BadStatusCodeError extends Error {

    constructor(response, body, url) {
        let msg = `Error ${response.statusCode}!`;
        super(msg);
        this.message = msg;
        this.response = response;
        this.body = body;
        this.url = url;
    }

    getMessage() {
        return this.message;
    }

    getResponse() {
        return this.response;
    }

    getBody() {
        return this.body;
    }

    getUrl() {
        return this.url;
    }

}

module.exports = BadStatusCodeError;
