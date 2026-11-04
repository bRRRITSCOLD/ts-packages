import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  icons,
} from "@brrritscold/core-react";

export function NotificationSettings() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
        <CardDescription>Choose what we email you about.</CardDescription>
      </CardHeader>
      <CardContent>
        <Badge variant="outline">Weekly digest</Badge>
        <Badge variant="secondary">Beta</Badge>
      </CardContent>
      <CardFooter>
        <Button variant="secondary">Cancel</Button>
        <Button>
          <icons.Mail />
          Save
        </Button>
        <Button variant="destructive" size="sm">
          <icons.Trash2 />
          Delete
        </Button>
        <Button variant="ghost" size="sm" disabled>
          Archived
        </Button>
      </CardFooter>
    </Card>
  );
}
