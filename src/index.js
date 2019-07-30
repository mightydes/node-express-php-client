const debug = require('debug')('node-express-php-client');
const request = require('request');
const BadStatusCodeError = require('./bad-status-code-error');

class PhpClientContext {

    /**
     * @param {String} locationKey
     * @param {Object} locationOptions
     */
    constructor(locationKey, locationOptions) {
        this.locationKey = locationKey;
        this.locationOptions = locationOptions;
    }

    /**
     * @param {String} url
     * @param {Object} payload
     * @param {Object} options
     * @returns {Promise}
     */
    callJson(url, payload = {}, options = {}) {
        debug(`callJson ${this.locationKey}:`, url);
        return new Promise((resolve, reject) => {
            const body = new Buffer(JSON.stringify(payload || {}));
            let requestOpt = {
                url: this.locationOptions.location + url,
                method: 'POST',
                headers: {},
                body: body
            };

            if (options.headers) {
                requestOpt.headers = options.headers;
            }
            requestOpt.headers['content-type'] = PhpClient.JSON_CONTENT_TYPE;
            requestOpt.headers['content-length'] = body.length;

            return request(requestOpt, (err, response, body) => {
                if (err) {
                    return reject(err);
                }
                if (response.statusCode >= 400) {
                    return reject(new BadStatusCodeError(response, body, requestOpt.url));
                }
                return resolve(response, body);
            });
        });
    }

    /**
     * @param {Object} req
     * @param {Object} res
     * @param {Object} options
     * @returns {*}
     */
    pass(req, res, options = {}) {
        const method = req.method.toUpperCase();
        let requestOpt = {
            url: this.locationOptions.location + req.originalUrl,
            method: method,
            headers: req.headers
        };
        debug(`pass ${this.locationKey}:`, requestOpt.url);

        if (this.locationOptions.json) {
            return this.passJson(req, res, requestOpt);
        }

        if (method === 'GET') {
            return request(requestOpt).pipe(res);
        }

        // Other methods:
        if (req.is('multipart/form-data')) {
            requestOpt.body = req.body;
            return request(requestOpt).pipe(res);
        }

        return this.passJson(req, res, requestOpt);
    }

    passJson(req, res, requestOpt) {
        const body = new Buffer(JSON.stringify(req.body || {}));
        requestOpt.method = 'POST';
        requestOpt.headers['content-type'] = PhpClient.JSON_CONTENT_TYPE;
        requestOpt.headers['content-length'] = body.length;
        requestOpt.body = body;
        return request(requestOpt).pipe(res);
    }

}

class PhpClient {

    /**
     * @param {String} defaultLocationKey
     * @param {Object} defaultLocationOptions
     */
    constructor(defaultLocationKey, defaultLocationOptions) {
        this.register = {};
        this.defaultLocation = '';
        this.addLocation(defaultLocationKey, defaultLocationOptions);
        this.setDefaultLocation(defaultLocationKey);
    }

    /**
     * @param {String} locationKey
     * @param {Object} locationOptions
     */
    addLocation(locationKey, locationOptions) {
        this.register[locationKey] = locationOptions;
    }

    /**
     * @param {String} locationKey
     * @returns {String}
     */
    setDefaultLocation(locationKey) {
        return this.defaultLocation = locationKey;
    }

    /**
     * @param {String|null} locationKey
     * @returns {Object}
     */
    statLocation(locationKey = null) {
        locationKey || (locationKey = this.defaultLocation);
        return this.register[locationKey];
    }

    /**
     * @param {String|null} locationKey
     * @returns {PhpClientContext}
     */
    useLocation(locationKey = null) {
        locationKey || (locationKey = this.defaultLocation);
        return new PhpClientContext(locationKey, this.statLocation(locationKey));
    }

}

PhpClient.JSON_CONTENT_TYPE = 'application/x-json;charset=UTF-8';

module.exports = PhpClient;
