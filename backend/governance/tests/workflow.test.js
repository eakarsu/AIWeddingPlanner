const test = require('node:test');
const assert = require('node:assert/strict');
const { evaluate } = require('../domain');

function fixture() {
  return {
  location:{id:'loc1',tenantId:'t1',availabilityVersion:'a1',permissionVersion:'p1',privacyPolicyVersion:'priv1',retentionDays:30},
  order:{id:'o1',customerId:'c1',ownerStaffId:'owner',eventDate:'2026-09-01',version:'v1',status:'scheduled'},
  services:[{id:'s1',vendorRef:'vendor1',availabilityVersion:'a1',priceVersion:'p1',scheduleWindow:'2026-09-01T10:00Z/18:00Z',quantity:1,availableQuantity:1}],
  pricing:{quoteVersion:'q1',subtotal:1000,tax:80,serviceFees:20,total:1100},
  payment:{providerRef:'pay1',status:'captured',idempotencyKey:'payment:0001',amount:1100,refundAmount:0,refundLimit:500},
  fulfillment:{partnerRef:'vendor1',status:'completed',receiptRef:'service:1',feedbackAt:'2026-09-01T20:00:00Z',autonomousCommitment:false,staffApproved:true,approvedBy:'reviewer'},
  communication:{queued:true,consentVersion:'c1',sent:false},
  reconciliation:{availability:true,payment:true,tax:true,accounting:true,scheduling:true,delivery:true},
  fixtures:{doubleOrder:true,stockRace:true,paymentDivergence:true,cancellationRefund:true,noShow:true,partialFulfillment:true,recovery:true}
};
}

test('accepts governed wedding service order', () => {
  const result = evaluate(fixture(), { tenant: 't1', actor: 'owner' });
  assert.deepEqual(result.errors, []);
});

test('blocks unsafe or ungoverned wedding service order', () => {
  const input = fixture();
  input.fulfillment.autonomousCommitment = true;
  assert.ok(evaluate(input, { tenant: 't1', actor: 'owner' }).errors.length > 0);
  assert.ok(evaluate(fixture(), { tenant: 'other', actor: 'owner' }).errors.length > 0);
});
