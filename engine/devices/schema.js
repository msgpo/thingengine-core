// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2015 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See COPYING for details

const fs = require('fs');
const path = require('path');
const lang = require('lang');
const Q = require('q');
const tmp = require('tmp');

const prefs = require('../prefs');
const Thingpedia = require('./thingpedia');

module.exports = new lang.Class({
    Name: 'SchemaRetriever',
    $rpcMethods: ['getSchema'],

    _init: function() {
        this._cache = new prefs.FilePreferences(platform.getWritableDir() + '/schemas.db');

        this._request = null;
        this._pendingRequests = [];
    },

    _ensureRequest: function() {
        if (this._request !== null)
            return;

        this._request = Q.delay(0).then(function() {
            var pending = this._pendingRequests;
            this._pendingRequests = [];
            console.log('Batched schema request for ' + pending);
            return Thingpedia.getSchemas(pending);
        }.bind(this)).then(function(everything) {
            var everything = JSON.parse(everything);
            for (var kind in everything)
                this._cache.set(kind, everything[kind]);
            return everything;
        }.bind(this));
    },

    getSchema: function(kind) {
        var cached = this._cache.get(kind);
        if (cached !== undefined)
            return Q(cached);

        if (this._pendingRequests.indexOf(kind) < 0)
            this._pendingRequests.push(kind);
        this._ensureRequest();
        return this._request.then(function(everything) {
            if (kind in everything)
                return everything[kind];
            else
                return null;
        });
    },
});
