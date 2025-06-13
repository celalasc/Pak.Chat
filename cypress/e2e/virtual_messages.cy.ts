import { mount } from 'cypress/react18'
import Messages from '../../frontend/components/Messages'
import type { UIMessage } from 'ai'

function createMessages(count: number): UIMessage[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `m${i}`,
    role: 'assistant' as const,
    parts: [{ type: 'text', text: `msg ${i}` }],
    content: `msg ${i}`,
    createdAt: new Date(),
  }))
}

describe('virtual messages', () => {
  it('mounts in under 16ms when rendering 500 messages', () => {
    const messages = createMessages(500)
    const start = performance.now()
    mount(
      <Messages
        threadId="t"
        messages={messages}
        status="done"
        setMessages={() => {}}
        reload={() => {}}
        error={null}
        stop={() => {}}
      />
    )
    cy.then(() => {
      const end = performance.now()
      expect(end - start).to.be.lessThan(16)
    })
  })
})
