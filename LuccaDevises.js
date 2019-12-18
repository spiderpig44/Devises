const fs = require('fs');
const _ = require('lodash');

function showHelper() {
  console.log('argument: path of the file ');
}

function checkArgs(args) {
  if (args.length !== 1) {
    console.error('Error : wrong number of arguments ', args.length);
    showHelper();
    process.exit();
  }

  if (args[0].toLowerCase() === '-help' || args[0].toLowerCase() === '-h') {
    showHelper();
    process.exit();
  }
}

function checkNbRate(nbRates, rates) {
  if (nbRates !== rates.length/2) {
    console.error('Error : you noticied ', nbRates, ' rates in the file but ', rates.length, ' rates are defined');
    process.exit();
  }
}

function parseValueToChange(line) {
  const cols = line.split(';');
  return {
    D1: cols[0],
    M: parseFloat(cols[1]).toFixed(4),
    D2: cols[2]
  };
}

function getRates(lines) {
  const rates = _.compact(_.map(lines, (line) => {
    // empty line
    if (line === '') return null;
    const cols = line.split(';');
    if (cols.length === 3 && line !== '') return {
      DD: cols[0],
      DA: cols[1],
      T: parseFloat(cols[2])
    };
    console.error('3 columns expected for rates definition');
  }));
  const inverseRates = _.map(rates, (rate) => {
    return {
      DD: rate.DA,
      DA: rate.DD,
      T: parseFloat(1 / rate.T).toFixed(4)
    };
  })
  return rates.concat(inverseRates);
}

function simpleOperation(value, rate) {
  console.log(Math.round(value * rate));
  process.exit();
}

function createRelations(rates) {
  const relations = {};
  _.forEach(rates, (rate) => {
    const results = _.filter(rates, {
      DA: rate.DD
    });
    relations[rate.DD] = [];
    _.forEach(results, (result) => {
      relations[rate.DD].push(result.DD);
    })
  })
  return relations;
}

function createGraph(relations) {
  const graph = {};
  _.forEach(relations, (relation) => {
    _.forEach(relation, (devise) => {
      if (!graph[devise]) graph[devise] = {};
      relations[devise].forEach(function (id) {
        graph[devise][id] = 1;
        if (!graph[id]) graph[id] = {};
        graph[id][devise] = 1;
      });
    });
  })
  return graph;
}


function findShortestPath(graph, startCurrency, stopCurrency) {
  const paths = {};
  paths[startCurrency] = [];
  paths[startCurrency].dist = 0;
  // until stopCurrency found or end of possible paths  
  while (true) {
    let root = null;
    let nearestCurrency = null;
    let dist = Infinity;
    for (const path in paths) {
      if (!paths[path]) continue;
      let pathDistance = paths[path].dist;
      let nextCurrencies = graph[path];
      for (const next in nextCurrencies) {
        if (paths[next]) continue;
        //choose nearestCurrency node with lowest cost
        const nextDistance = nextCurrencies[next] + pathDistance;
        if (nextDistance < dist) {
          root = paths[path];
          nearestCurrency = next;
          dist = nextDistance;
        }
      }
    }
    // End of paths
    if (dist === Infinity) break;
    paths[nearestCurrency] = root.concat(nearestCurrency);
    paths[nearestCurrency].dist = dist;
    // stop currency found, shortest path too!
    if (nearestCurrency == stopCurrency) break;
  }
  return paths;
}

function complexOperation(value, deviseStart, deviseStop) {
  let result = value;
  let deviseToSearch = deviseStart;
  _.forEach(solutions[deviseStop], (solution) => {
    result = result * (_.find(rates, {
      DD: deviseToSearch,
      DA: solution
    })).T;
    deviseToSearch = solution;
  })
  console.log(Math.round(result))
  process.exit();
}

// BEGIN
const args = process.argv.slice(2);
checkArgs(args);

// Read and parse File
const text = fs.readFileSync(args[0], 'utf8');
const lines = text.split('\n');
// start currency, stop currency, value
const valueToChange = parseValueToChange(lines[0]);
lines.shift();

const nbRates = parseInt(lines[0]);
lines.shift();

// Get all rates and inverted too
const rates = getRates(lines);
checkNbRate(nbRates, rates);

// if direct way to exchange rate
let operation = _.find(rates, {
  DD: valueToChange.D1,
  DA: valueToChange.D2
});
if (operation) {
  simpleOperation(valueToChange.M, operation.T);
}

// Create relations array for all rates and a graph to search the shortest path
const relations = createRelations(rates);
const graph = createGraph(relations);
let solutions = findShortestPath(graph, valueToChange.D1, valueToChange.D2);

// run through the shortest path
complexOperation(valueToChange.M, valueToChange.D1, valueToChange.D2)