const { assert } = require('chai');

const DaiToken = artifacts.require('DaiToken');
const DappToken = artifacts.require('DappToken');
const TokenFarm = artifacts.require('TokenFarm');

require('chai').use(require('chai-as-promised')).should();

function tokens(n) {
  return web3.utils.toWei(n, 'ether');
}

contract('TokenFarm', ([owner, investor]) => {
  let daiToken, dappToken, tokenFarm;

  before(async () => {
    // Load Contracts
    daiToken = await DaiToken.new();
    dappToken = await DappToken.new();
    tokenFarm = await TokenFarm.new(dappToken.address, daiToken.address);

    // Transfer all Dapp tokens to farm (1 million)
    await dappToken.transfer(tokenFarm.address, tokens('1000000'));

    // Send tokens to investor
    await daiToken.transfer(investor, tokens('100'), { from: owner });
  });

  describe('Mock DAI deployment', async () => {
    it('has a name', async () => {
      const name = await daiToken.name();
      assert.equal(name, 'Mock DAI Token');
    });
  });

  describe('Dapp Token deployment', async () => {
    it('has a name', async () => {
      const name = await dappToken.name();
      assert.equal(name, 'DApp Token');
    });
  });

  describe('Token Farm deployment', async () => {
    it('has a name', async () => {
      const name = await tokenFarm.name();
      assert.equal(name, 'Dapp Token Farm');
    });

    it('contract has tokens', async () => {
      let balance = await dappToken.balanceOf(tokenFarm.address);
      assert.equal(balance.toString(), tokens('1000000'));
    });
  });

  describe('Farming Tokens', async () => {
    it('rewards investors for staking mDai tokens', async () => {
      let result;

      // check investor balance before staking
      result = await daiToken.balanceOf(investor);
      assert.equal(
        result.toString(),
        tokens('100'),
        'investor mock dai wallet balance correct before staking'
      );

      // Stake mock dai tokens
      await daiToken.approve(tokenFarm.address, tokens('100'), {
        from: investor,
      });
      await tokenFarm.stakeTokens(tokens('100'), { from: investor });

      // Check the staking result
      result = await daiToken.balanceOf(investor);
      assert.equal(
        result.toString(),
        tokens('0'),
        'investor Mock DAI wallet balance correct after staking'
      );

      result = await daiToken.balanceOf(tokenFarm.address);
      assert.equal(
        result.toString(),
        tokens('100'),
        'token farm Mock DAI wallet balance correct after staking'
      );

      result = await tokenFarm.stakingBalance(investor);
      assert.equal(
        result.toString(),
        tokens('100'),
        'investor staking balance correct after staking'
      );

      result = await tokenFarm.isStaking(investor);
      assert.equal(
        result.toString(),
        'true',
        'investor staking status correct after staking'
      );

      // Issue Tokens
      await tokenFarm.issueTokens({ from: owner });
      result = await dappToken.balanceOf(investor);
      assert.equal(
        result,
        tokens('100'),
        'investor Dapp tokens should be 100 after issuance'
      );

      // Ensure the only the owner can issue tokens
      await tokenFarm.issueTokens({ from: investor }).should.be.rejected;

      // unstake the tokens
      result = await tokenFarm.unstakeTokens({ from: investor });

      result = await daiToken.balanceOf(investor);
      assert.equal(
        result.toString(),
        tokens('100', 'investor mock dai wallet balance correct after staking')
      );

      result = await daiToken.balanceOf(tokenFarm.address);
      assert.equal(
        result,
        tokens('0'),
        'Token farm mock dai balance correct after staking'
      );

      result = await tokenFarm.stakingBalance(investor);
      assert.equal(
        result.toString(),
        tokens('0'),
        'investor staking balance correct after staking'
      );

      result = await tokenFarm.isStaking(investor);
      assert.equal(
        result.toString(),
        'false',
        'investor staking status correct after staking'
      );
    });
  });
});
