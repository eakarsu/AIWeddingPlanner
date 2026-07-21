'use strict';
function evaluate(input = {}, context = {}) {
  const errors = [];
  const location = input.location || {};
  const order = input.order || {};
  const services = input.services || [];
  const pricing = input.pricing || {};
  const payment = input.payment || {};
  const fulfillment = input.fulfillment || {};
  const communication = input.communication || {};
  const reconciliation = input.reconciliation || {};
  if (!location.id || !location.tenantId || location.tenantId !== context.tenant || !location.availabilityVersion || !location.permissionVersion
      || !location.privacyPolicyVersion || !location.retentionDays) errors.push('tenant/location event scope required');
  const serviceIds = new Set();
  for (const service of services) {
    if (!service.id || serviceIds.has(String(service.id)) || !service.vendorRef || !service.availabilityVersion
        || !service.priceVersion || !service.scheduleWindow || !Number.isInteger(service.quantity) || service.quantity < 1
        || service.availableQuantity < service.quantity) errors.push('available versioned wedding service invalid');
    serviceIds.add(String(service.id));
  }
  if (!order.id || !order.customerId || !order.ownerStaffId || order.ownerStaffId !== context.actor || !order.eventDate || !order.version
      || !['reserved','payment_pending','paid','scheduled','in_service','completed','cancelled','partial','failed','recovery'].includes(order.status)) errors.push('durable wedding order state invalid');
  if (!pricing.quoteVersion || !Number.isFinite(pricing.subtotal) || !Number.isFinite(pricing.tax)
      || !Number.isFinite(pricing.serviceFees) || pricing.total !== pricing.subtotal + pricing.tax + pricing.serviceFees) errors.push('reconciled price breakdown invalid');
  if (!payment.providerRef || !['pending','authorized','captured','refunded','failed'].includes(payment.status)
      || !payment.idempotencyKey || payment.amount !== pricing.total || (payment.refundAmount || 0) > payment.refundLimit) errors.push('payment/refund state invalid');
  if (!fulfillment.partnerRef || !['queued','confirmed','in_service','completed','partial','no_show','failed','recovery'].includes(fulfillment.status)
      || (fulfillment.status === 'completed' && !fulfillment.receiptRef) || !fulfillment.feedbackAt
      || fulfillment.autonomousCommitment || fulfillment.staffApproved !== true || !fulfillment.approvedBy
      || fulfillment.approvedBy === order.ownerStaffId) errors.push('independently approved service fulfillment invalid');
  if (communication.queued && (!communication.consentVersion || communication.sent)) errors.push('consented queued communication required');
  for (const key of ['availability','payment','tax','accounting','scheduling','delivery']) {
    if (reconciliation[key] !== true) errors.push(`reconciliation ${key} required`);
  }
  for (const key of ['doubleOrder','stockRace','paymentDivergence','cancellationRefund','noShow','partialFulfillment','recovery']) {
    if (input.fixtures?.[key] !== true) errors.push(`fixture ${key} required`);
  }
  return { errors, result: { orderId: order.id, serviceCount: services.length, disposition: errors.length ? 'exception' : 'ready-for-approved-service' },
    assumptions: ['No charge, reservation, vendor commitment, or message is automatic'],
    uncertainty: { partnerSystemsConnected: false, staffReviewRequired: true } };
}
module.exports = { evaluate };
