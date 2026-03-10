#portfolio-json
node dist/index.js --backingRatio 100 --liquidityRatio 20 --concentrationLimit 40 --qualityThreshold 80 --actusUrl http://34.203.247.32:8083/eventsBatch --portfolio ./config/portfolio-balanced-1M.json

node dist/index.js --backingRatio 100 --liquidityRatio 20 --concentrationLimit 40 --qualityThreshold 80 --actusUrl http://34.203.247.32:8083/eventsBatch --portfolio ./config/portfolio-diversified-5M.json

node dist/index.js --backingRatio 100 --liquidityRatio 50 --concentrationLimit 35 --qualityThreshold 90 --actusUrl http://34.203.247.32:8083/eventsBatch --portfolio ./config/portfolio-conservative-10M.json

node dist/index.js --backingRatio 100 --liquidityRatio 20 --concentrationLimit 25 --qualityThreshold 80 --actusUrl http://34.203.247.32:8083/eventsBatch --portfolio ./config/portfolio-aggressive-8M.json

#test-scenarios-json **************************************************************************************************************************************************************************************************************
node dist/index.js --backingRatio 100 --liquidityRatio 20 --concentrationLimit 40 --qualityThreshold 80 --actusUrl http://34.203.247.32:8083/eventsBatch --portfolio ./config/test-scenarios/scenario-01-all-pass.json

#Quality fails
node dist/index.js --backingRatio 100 --liquidityRatio 20 --concentrationLimit 40 --qualityThreshold 80 --actusUrl http://34.203.247.32:8083/eventsBatch --portfolio ./config/test-scenarios/scenario-02-quality-fail.json

#Concentration Fails
node dist/index.js --backingRatio 100 --liquidityRatio 20 --concentrationLimit 40 --qualityThreshold 80 --actusUrl http://34.203.247.32:8083/eventsBatch --portfolio ./config/test-scenarios/scenario-03-concentration-fail.json

#Concentration + Quality Fail
node dist/index.js --backingRatio 100 --liquidityRatio 20 --concentrationLimit 40 --qualityThreshold 80 --actusUrl http://34.203.247.32:8083/eventsBatch --portfolio ./config/test-scenarios/scenario-04-concentration-quality-fail.json

#Liquidity Fails
node dist/index.js --backingRatio 100 --liquidityRatio 20 --concentrationLimit 40 --qualityThreshold 80 --actusUrl http://34.203.247.32:8083/eventsBatch --portfolio ./config/test-scenarios/scenario-05-liquidity-fail.json

#Liquidity + Quality Fail
node dist/index.js --backingRatio 100 --liquidityRatio 20 --concentrationLimit 40 --qualityThreshold 80 --actusUrl http://34.203.247.32:8083/eventsBatch --portfolio ./config/test-scenarios/scenario-06-liquidity-quality-fail.json

#Liquidity + Concentration Fail
node dist/index.js --backingRatio 100 --liquidityRatio 20 --concentrationLimit 40 --qualityThreshold 80 --actusUrl http://34.203.247.32:8083/eventsBatch --portfolio ./config/test-scenarios/scenario-07-liquidity-concentration-fail.json

#Only backigng pass
node dist/index.js --backingRatio 100 --liquidityRatio 20 --concentrationLimit 40 --qualityThreshold 80 --actusUrl http://34.203.247.32:8083/eventsBatch --portfolio ./config/test-scenarios/scenario-08-only-backing-pass.json

#Backing Fail
node dist/index.js --backingRatio 100 --liquidityRatio 20 --concentrationLimit 40 --qualityThreshold 80 --actusUrl http://34.203.247.32:8083/eventsBatch --portfolio ./config/test-scenarios/scenario-09-backing-fail.json

#backing+quality fail 
node dist/index.js --backingRatio 100 --liquidityRatio 20 --concentrationLimit 40 --qualityThreshold 80 --actusUrl http://34.203.247.32:8083/eventsBatch --portfolio ./config/test-scenarios/scenario-10-backing-quality-fail.json

#Backing+Concentration fail 
node dist/index.js --backingRatio 100 --liquidityRatio 20 --concentrationLimit 40 --qualityThreshold 80 --actusUrl http://34.203.247.32:8083/eventsBatch --portfolio ./config/test-scenarios/scenario-11-backing-concentration-fail.json

#Backing+Concentration+Quality fail
node dist/index.js --backingRatio 100 --liquidityRatio 20 --concentrationLimit 40 --qualityThreshold 80 --actusUrl http://34.203.247.32:8083/eventsBatch --portfolio ./config/test-scenarios/scenario-12-backing-concentration-quality-fail.json

#Backing+Liquidity fail
node dist/index.js --backingRatio 100 --liquidityRatio 20 --concentrationLimit 40 --qualityThreshold 80 --actusUrl http://34.203.247.32:8083/eventsBatch --portfolio ./config/test-scenarios/scenario-13-backing-liquidity-fail.json

#Backing + Liquidity + Quality Fail
node dist/index.js --backingRatio 100 --liquidityRatio 20 --concentrationLimit 40 --qualityThreshold 80 --actusUrl http://34.203.247.32:8083/eventsBatch --portfolio ./config/test-scenarios/scenario-14-backing-liquidity-quality-fail.json

#Only Quality Passes
node dist/index.js --backingRatio 100 --liquidityRatio 20 --concentrationLimit 40 --qualityThreshold 80 --actusUrl http://34.203.247.32:8083/eventsBatch --portfolio ./config/test-scenarios/scenario-15-only-quality-pass.json

#ALL FAIL
node dist/index.js --backingRatio 100 --liquidityRatio 20 --concentrationLimit 40 --qualityThreshold 80 --actusUrl http://34.203.247.32:8083/eventsBatch --portfolio ./config/test-scenarios/scenario-16-all-fail.json