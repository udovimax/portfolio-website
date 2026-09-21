import test from 'node:test'
import assert from 'node:assert/strict'
import { validateContactFlowStep } from './contactFlow.ts'

test('requires intent, message, identity, and valid email on their respective steps', () => {
  assert.match(validateContactFlowStep('intent', { interest: '' }) ?? '', /choose/i)
  assert.match(validateContactFlowStep('details', { interest: 'General enquiry', message: '' }) ?? '', /message/i)
  assert.match(validateContactFlowStep('identity', { name: '', email: 'max@example.com' }) ?? '', /name/i)
  assert.match(validateContactFlowStep('identity', { name: 'A', email: 'bad' }) ?? '', /email/i)
  assert.equal(validateContactFlowStep('review', {
    interest: 'General enquiry',
    message: 'Hello',
    name: 'A',
    email: 'max@example.com',
  }), null)
})
