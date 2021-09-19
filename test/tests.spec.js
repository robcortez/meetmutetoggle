const assert = require('chai').assert
const chrome = require('sinon-chrome/extensions')
global.chrome = chrome;
const background = require('../lib/background.js')


describe('background script', function() {
    describe('meetting url regex', function() {
        it('should return meeting id when given a meet URL', function() {
            assert.equal('abcd-1234-test', background.getMeetingId('https://meet.google.com/abcd-1234-test'), 'meeting id is abcd-1234-test')
            assert.equal('abcd-1234-test', background.getMeetingId('https://meet.google.com/_meet/abcd-1234-test?param1=true&param2=1234'), 'meeting id is abcd-1234-test')
        })
    })
});