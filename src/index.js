const debug = require('debug')('node-express-php-client');
const axios = require('axios');
const Response = require('responselike');
const PhpRejectionError = require('./php-rejection-error');

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
    post(url, payload = {}, options = {}) {
        debug(`post ${this.locationKey}:`, url);
        return new Promise((resolve, reject) => {
            const body = new Buffer(JSON.stringify(payload || {}));
            let requestOpt = {
                url: this.locationOptions.location + url,
                method: 'POST',
                maxRedirects: 0,
                headers: {},
                data: body
            };

            if (options.headers) {
                requestOpt.headers = options.headers;
            }
            requestOpt.headers['content-type'] = PhpClient.JSON_CONTENT_TYPE;
            requestOpt.headers['content-length'] = body.length;

            return axios(requestOpt)
                .then((response) => resolve(
                    new Response(response.status, response.headers, response.data, url)
                ))
                .catch((rejection) => reject(new PhpRejectionError(
                    new Response(rejection.response.status, rejection.response.headers, rejection.response.data, url)
                )));
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
            maxRedirects: 0,
            responseType: 'stream',
            headers: req.headers
        };
        debug(`pass ${this.locationKey}:`, requestOpt.url);

        if (this.locationOptions.json) {
            return this.passJson(req, res, requestOpt);
        }

        if (!this.isBodyAvailable(method)) {
            return this.__pass(req, res, requestOpt);
        }

        if (req.is('multipart/form-data') || req.is('application/x-www-form-urlencoded')) {
            requestOpt.data = req.body;
            return this.__pass(req, res, requestOpt);
        }

        return this.passJson(req, res, requestOpt);
    }

    /**
     * @private
     * @param {Object} req
     * @param {Object} res
     * @param {Object} requestOpt
     * @returns {*}
     */
    __pass(req, res, requestOpt) {
        return axios(requestOpt)
            .then((response) => {
                res.set(response.headers);
                res.status(response.status);
                return response.data.pipe(res);
            })
            .catch((rejection) => {
                res.set(rejection.response.headers);
                res.status(rejection.response.status);
                return rejection.response.data.pipe(res)
            });
    }

    /**
     * @private
     * @param {Object} req
     * @param {Object} res
     * @param {Object} requestOpt
     * @returns {*}
     */
    passJson(req, res, requestOpt) {
        const body = new Buffer(JSON.stringify(req.body || {}));
        if (!this.isBodyAvailable(requestOpt.method)) {
            requestOpt.method = 'POST';
        }
        requestOpt.headers['content-type'] = PhpClient.JSON_CONTENT_TYPE;
        requestOpt.headers['content-length'] = body.length;
        requestOpt.data = body;
        return this.__pass(req, res, requestOpt);
    }

    /**
     * @private
     * @param method
     * @returns {boolean}
     */
    isBodyAvailable(method) {
        return ['POST', 'PUT', 'PATCH'].indexOf(method) > -1;
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
