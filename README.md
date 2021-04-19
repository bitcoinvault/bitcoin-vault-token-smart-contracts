# Dependencies installation
* `npm install -g truffle`
* `npm install @openzeppelin/contracts`
# Compilation
* `truffle compile`
# Test
* Build or download Ganache (see `https://www.trufflesuite.com/ganache`)
* Run Ganache app
* `truffle test`
* In case test environment cannot connect to test node, check `networks.development.port` value with port used by Ganache (7545?)