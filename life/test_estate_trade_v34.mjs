import assert from 'node:assert/strict';
import {
 ESTATE_PRODUCTS,initEstateTrade,estateRank,recordEstateHarvest,manufactureEstateProduct,
 sellEstateProduct,estateDailyOrders,estateOrderProgress,fulfillEstateOrder
} from './estate-trade-v34.js';

const date=new Date(2026,9,18,12,0,0);
const s={coins:1000,xp:160,estate:{tier:0,plots:[],buildings:[],stock:{lettuce:2,carrot:1,berry:3}}};
assert.equal(initEstateTrade(s).reputation,0);
assert.equal(estateRank(s).name,'새싹 정착민');
const initial=structuredClone(s);
const failed=manufactureEstateProduct(s,'apple_pie');
assert.equal(failed.ok,false,'Insufficient ingredients must not change money or inventory');
assert.equal(s.coins,initial.coins);
assert.deepEqual(s.estate.stock,initial.estate.stock);

const jam=manufactureEstateProduct(s,'berry_jam');
assert.equal(jam.ok,true);
assert.equal(s.coins,880,'Crafting spends fee exactly once');
assert.equal(s.estate.stock.berry,0);
assert.equal(s.estate.trade.goods.berry_jam,1);
assert.equal(s.estate.trade.stats.made,1);
assert.equal(manufactureEstateProduct(s,'berry_jam').ok,false,'Cannot duplicate goods without ingredients');

const sale=sellEstateProduct(s,'berry_jam',2);
assert.equal(sale.ok,true);
assert.equal(s.estate.trade.goods.berry_jam,0);
assert.equal(s.estate.trade.stats.sold,1);
const afterSaleCoins=s.coins;
assert.equal(sellEstateProduct(s,'berry_jam').ok,false,'Selling a consumed good is blocked');
assert.equal(s.coins,afterSaleCoins);

recordEstateHarvest(s);
assert.equal(s.estate.trade.stats.harvested,1);
const board=estateOrderProgress(s,date);
assert.equal(board.orders.length,3);
assert.equal(board.orders[0].id,'market_vegetables','A starter order exists every day');
assert.equal(board.orders[0].ready,true);
assert.deepEqual(estateDailyOrders(date).map(o=>o.id),estateDailyOrders(date).map(o=>o.id),'Same day contracts deterministic');
const first=fulfillEstateOrder(s,'market_vegetables',2,date);
assert.equal(first.ok,true);
assert.equal(s.estate.stock.lettuce,0);
assert.equal(s.estate.stock.carrot,0);
assert.equal(s.estate.trade.reputation,4);
assert.equal(s.estate.trade.stats.fulfilled,1);
assert.equal(s.xp,172);
const paid=s.coins, xp=s.xp;
const replay=fulfillEstateOrder(s,'market_vegetables',2,date);
assert.equal(replay.ok,false,'Repeated fulfillment same day is rejected');
assert.equal(s.coins,paid,'Replay must not mint coins');
assert.equal(s.xp,xp,'Replay must not grant XP');
assert.equal(s.estate.trade.reputation,4);

const missing=fulfillEstateOrder(s,'jam_delivery',2,date);
assert.equal(missing.ok,false);
assert.equal(s.estate.trade.stats.fulfilled,1);

const afterReload=structuredClone(s);
assert.equal(estateOrderProgress(afterReload,date).orders[0].complete,true,'Persisted fulfillment survives reload');
assert.equal(afterReload.estate.trade.reputation,4);
const tomorrow=new Date(2026,9,19,12);
assert.equal(estateOrderProgress(afterReload,tomorrow).orders[0].complete,false,'Only daily contracts reset');
assert.equal(afterReload.estate.trade.stats.fulfilled,1,'Lifetime reputation stats persist');
assert.equal(ESTATE_PRODUCTS.length,3);
console.log('v34 estate economy: crafting, fee, stock, order replay and lifetime reputation passed');
