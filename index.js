var _ = require('lodash'),
    google = require('googleapis'),
    OAuth2 = google.auth.OAuth2;

var oauth2Client = new OAuth2();
var service = google.drive('v2');

var pickData = ['id', 'name', 'emailAddress'];
var resource = {
    role: 'reader',
    type: 'user'
};

module.exports = {
    checkAuthOptions: function (step, dexter) {

        if(!step.input('fileId').first() || _.isEmpty(step.input('emailAddress').first())) {

            this.fail('A [name, emailAddress] inputs variable is required for this module');
        }

        if(!dexter.environment('google_access_token')) {

            this.fail('A google_access_token environment variable is required for this module');
        }
    },

    /**
     * Recursive send access.
     *
     * @param fileId    Id file.
     * @param mails     Array mails
     * @param lastCb    Callback, after all sends.
     * @param results   result
     */
    sendMails: function (fileId, mails, lastCb, results) {

        results = results || { err: [], success: [] };

        if (_.isArray(mails) && !_.isEmpty(mails)) {
            var mail = _.first(mails);

            service.permissions.insert({

                fileId: fileId,
                resource: _.merge(resource, {value: mail})
            }, function (err, data) {

                if (err) {

                    results.err.push(err);
                } else {

                    results.success.push(_.pick(data, pickData));
                }

                this.sendMails.apply(this, [fileId, _.difference(mails, [mail]), lastCb, results]);
            }.bind(this));
        } else {

            lastCb(results.err, results.success);
        }
    },

    /**
     * The main entry point for the Dexter module
     *
     * @param {AppStep} step Accessor for the configuration for the step using this module.  Use step.input('{key}') to retrieve input data.
     * @param {AppData} dexter Container for all data used in this workflow.
     */
    run: function(step, dexter) {

        this.checkAuthOptions(step, dexter);
        // set credential
        oauth2Client.setCredentials({access_token: dexter.environment('google_access_token'), refresh_token: dexter.environment('google_refresh_token')});
        google.options({ auth: oauth2Client });
        // recursive send access
        this.sendMails(step.input('fileId').first(), step.input('emailAddress').toArray(), function (err, data) {

            if (!_.isEmpty(err)) {

                this.fail(err);
            } else {

                this.complete(data);
            }
        }.bind(this));
    }
};
