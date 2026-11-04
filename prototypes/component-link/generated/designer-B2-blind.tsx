import { Button, Panel, Tag, EnvelopeIcon, BinIcon } from '@brrritscold/core-react';

export function NotificationSettings() {
  return (
    <Panel
      title="Notifications"
      subtitle="Choose what we email you about."
      actions={
        <>
          <Button variant="secondary">Cancel</Button>
          <Button icon={<EnvelopeIcon />}>Save</Button>
          <Button variant="danger" size="small" icon={<BinIcon />}>
            Delete
          </Button>
          <Button variant="subtle" size="small" disabled>
            Archived
          </Button>
        </>
      }
    >
      <Tag variant="outlined">Weekly digest</Tag>
      <Tag variant="muted">Beta</Tag>
    </Panel>
  );
}
