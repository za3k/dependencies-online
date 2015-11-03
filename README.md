Dependencies Online
---

Simple asynchronous dependency resolver

Overview
---

This is a dependency graph for loading things as early as possible, once anything they depend on is loaded. The dependency graph does not know anything about how loading works--it can be used to resolve any kind of dependencies. To use, `npm install dependencies-online` and then `require('dependencies-online').

API
---

DependencyGraph
---

Nodes in the graph are strings with the `name` of the module

- `new DependencyGraph(options)` - create a new dependency graph. if `options.checkCircular` is true (the default), then trying to add a circular dependency will throw an error that includes the cycle in the message.
- `add(name, dependencies, resolver)` - add a node in the graph. `dependencies` is an array of nodes this node depends on to have resolved before loading. if `resolver` is provided, it is called when the module should load automatically. `resolver` can return the module or a promise. `add` returns a promise indicating whether the dependencies have loaded successfully.
- `has(name)` - check if the node exists in the graph.
- `isResolved(name)` - returns a promise indicating whether the dependency was resolved successfully or unsuccessfully
- `resolve(name, success, details)` - mark a dependency as resolved/loaded. If `success` is true, marks the dependency as resolved. `details` can be used to store i.e. the loaded module. If `sucesss` is false, indicates that the module was not loaded and never will be, causing everything that depends on it to likewise fail. `details` can include any error message.

Examples
---

    var DependencyGraph = require('dependencies-online')
    
    var graph = new DependencyGraph()
    graph.add('a')
    graph.add('b', ['a']).then(function() {
        console.log("resolving module B immediately");
        graph.resolve('b');
        return 'module b';
    });
    graph.add('c', ['b'], function() {
        return new Promise(function(resolve, reject) { 
            console.log("resolving module C immediately in a 'resolver' promise");
            resolve('module c');
        });
    });
    graph.add('d');

    graph.has('a'); // True
    graph.has('zzz'); // False
    graph.isResolved('c'); // False

    graph.resolve('a', true, 'module a'); // Prints: resolving module B immediately
                                          //         resolving module C immediately in a 'resolver' promise
    graph.isResolved('a'); // True
    graph.isResolved('b'); // True
    graph.isResolved('c'); // True
    graph.isResolved('d'); // False
