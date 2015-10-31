(function() {
  // Dummy promises which can be replaced allow forward references
  function makeDummyPromise() {
    return new Promise(function(resolve, reject) {
      this.resolve = resolve;
      this.reject = reject;
      this.isDummy = true;
      var self = this;
    });
  }
  // findCycle based on https://github.com/jriecken/dependency-graph
  function findCycle(start, edges) {
    var visited = [];
    var currentPath = [];
    function DFS(name) {
      visited[name] = true;
      currentPath.push(name);
      for (var i=0; i<edges[name].length; i++) {
        var edgeName = edges[name][i];
        if (!visited[edgeName]) {
          var cycle = DFS(edgeName);
          if (cycle) return cycle;
        } else if (currentPath.indexOf(edgeName) >= 0) {
          currentPath.push(edgeName);
          return currentPath;
        }
      };
      currentPath.pop()
    };
    return DFS(start)
  }
  var DependenciesOnline = function(options) {
    options = options || {};
    this.ready = {};
    this.resolved = {};
    this.checkCircular = (options.checkCircular == void 0) ? true : options.checkCircular;
    if (this.checkCircular) {
      this.incomingEdges = {};
      this.outgoingEdges = {};
    }
  };
  DependenciesOnline.prototype = {
    // Accepts:
    //   name: a unique name to identify the dependency
    //   dependencies: an array
    //   resolver: a function to be called once the dependency is ready to be loaded, which asynchronously resolves the dependency (returning a promise)
    add: function(name, dependencies, resolver) {
      var self = this;
      dependencies = dependencies || [];
      if (this.has(name)) {
        throw new Error("Duplicate node " + name);
      }

      if (this.checkCircular) {
        this.incomingEdges[node] = this.incomingEdges[node] || [];
        for (var requirement of dependencies) {
          var requirement = dependencies[i];
          this.outgoingEdges[requirement] = this.incomingEdges[requirement] || [];
          this.incomingEdges[node].push(requirement);
          this.outgoingEdges[requirement].push(node);
        }

        var cycle = findCycle(name, this.outgoingEdges);
        if (!cycle) {
          cycle = findCycle(name, this.incomingEdges);
          if (cycle) cycle.reverse();
        }
        if (cycle) {
          throw new Error("Dependency Cycle Found: " + cycle.join(" -> "));
        }
      }

      var dependenciesResolved = dependencies.map(this.isResolved.bind(this));
      var ready = Promise.all(dependenciesResolved);
      this.ready[name] = ready
      if (resolver) {
        ready.then(function() {
          try {
            var promise = resolver.apply(null, arguments);
            promise = Promise.resolve(promise);
            promise.then(function(details) {
                self.resolve(name, true, details);
            }, function(err) {
                self.resolve(name, false, err);
            });
          } catch (err) {
            self.resolve(name, false, err);
          }
        });
      }
      return ready;
    },
    has: function(name) {
      return !!this.ready[name];
    },
    isResolved: function(name) {
      if (!this.resolved[name]) {
        this.resolved[name] = this.makeDummyPromise();
      }
      return this.resolved[name];
    },
    resolve: function(name, success, details) {
      var promise = this.isResolved(name);
      if (typeof(success) == 'undefined' || success) {
        promise.resolve(details);
      } else {
        promise.reject(details);
      }
    },
  };

  if (window) window.DependenciesOnline = DependenciesOnline;
  if (exports) exports = DependenciesOnline;
)()
