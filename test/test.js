'use strict';
var DependencyGraph = require('../lib/dependencies-online.js')

var assert = require('chai').assert
var chai = require("chai");
var chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);

assert.neverSettled = function(promise, timeout) {
  if (typeof(timeout) !== 'number') timeout = 1;
  return new Promise(function(resolve, reject) {
    setTimeout(function() { resolve(); });
    promise.then(function() { reject(); }, function() { reject(); });
  });
}

describe('dependencies-online', function() {
  var dg;
  beforeEach(function() {
    dg = new DependencyGraph();
  });
  it('should be able to add a node', function() {
    dg.add('a');
    assert.ok(dg.has('a'));
    assert.notOk(dg.has('b'));
  });
  it('can\'t add the same node twice', function() {
    dg.add('dup');
    assert.throws(function() {
      dg.add('dup');
    }, "Duplicate node dup");
  });
  it('should complete an empty set of dependencies', function() {
    var depends = dg.add('a');
    return assert.isFulfilled(depends, "depedencies are resolved");
  });
  it('should resolve', function() {
    var moduleA = { "name": "Module A" };
    dg.add('a');

    this.timeout(5);
    dg.resolve('a', true, moduleA);
    var resolved = dg.isResolved('a');
    return assert.isFulfilled(resolved, "is resolved");
  });
  it('should resolve to the loaded value', function() {
    var moduleA = { "name": "Module A" };
    dg.add('a');

    this.timeout(5);
    dg.resolve('a', true, moduleA);
    var resolved = dg.isResolved('a');
    return assert.becomes(resolved, moduleA);
  });
  it('should negatively resolve to the given error', function() {
    var error = new Error("An example error");
    dg.add('a');

    this.timeout(5);
    dg.resolve('a', false, error);
    var resolved = dg.isResolved('a');
    return assert.isRejected(resolved, error);
  });
  it('should add a node with a dependency', function() {
    dg.add('a');
    dg.add('b', ['a']);
    assert.ok(dg.has('a'));
    assert.ok(dg.has('b'));
  });
  it('should support forward reference', function() {
    dg.add('b', ['a']);
    dg.add('a');
    assert.ok(dg.has('a'));
    assert.ok(dg.has('b'));
  });
  it('should load a positively resolved dependency', function() {
    dg.add('a');
    var depends = dg.add('b', ['a']);
    dg.resolve('a');
    return assert.isFulfilled(depends);
  });
  it('should load a positively resolved dependency with forward reference', function() {
    var depends = dg.add('b', ['a']);
    dg.add('a');
    dg.resolve('a');
    return assert.isFulfilled(depends);
  });
  it('should fail with a negatively resolved dependency', function() {
    dg.add('neg-resolved');
    dg.add('pending', ['neg-resolved']);
    this.timeout(5);
    dg.resolve('neg-resolved', false, new Error("A sample error in a depedency"));
    var resolved = dg.isResolved('pending');
    return assert.isRejected(resolved);
  });
  it('should run module from resolver as a function', function(done) {
    dg.add('pos-resolved');
    dg.add('test', ['pos-resolved'], function() {
      done();
      return "loaded";
    });
    this.timeout(5);
    dg.resolve('pos-resolved');
  });
  it('should run module from resolver as a promise', function(done) {
    dg.add('pos-resolved');
    var complete = new Promise(function(resolve, reject) {
       resolve();
    });
    dg.add('test', ['pos-resolved'], function() {
      return complete;
    });
    this.timeout(5);
    dg.resolve('pos-resolved');
    complete.then(function() {
      done();
    });
  });
  it('should run module from the returned promise', function() {
    dg.add('pos-resolved');
    dg.add('test', ['pos-resolved']).then(function() {
      dg.resolve('test');
      return "Imaginary module loaded";
    });
    dg.resolve('pos-resolved');
    var resolved = dg.isResolved('test');
    return assert.isFulfilled(resolved);
  });
  it('should not start loading if its depedency does not load', function() {
    dg.add('never-resolves');
    var loaded = dg.add('test', ['never-resolved']);
    return assert.neverSettled(loaded);
  });
  it('should not finish resolving if its dependency does not load', function() {
    dg.add('never-resolves');
    dg.add('test', ['never-resolved']);
    return assert.neverSettled(dg.isResolved('test'));
  });
  it('should not finish resolving if there is no resolution method', function() {
    dg.add('resolves');
    dg.add('test', ['resolves']);
    dg.resolve('resolves');
    return assert.neverSettled(dg.isResolved('test'));
  });
  it('should throw error on circular insert', function() {
    dg.add('b', ['a']);
    dg.add('c', ['b']);
    assert.throws(function() {
      dg.add('a', ['c']);
    }, "Dependency Cycle Found: a -> b -> c");
  });
  it('should ignore circular insert if instructed', function() {
    dg = new DependencyGraph({ checkCircular: false });
    dg.add('b', ['a']);
    dg.add('c', ['b']);
    assert.doesNotThrow(function() {
      dg.add('a', ['c']);
    });
  });
});
