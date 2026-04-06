"use client";

import { BarChartOutlined, LineChartOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Space, Typography } from "antd";

const { Title, Paragraph, Text } = Typography;

export default function AdminAnalyticsPage() {
  const embed = process.env.NEXT_PUBLIC_ANALYTICS_DASHBOARD_URL?.trim();
  const plausibleDomain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN?.trim();
  const proxied = process.env.NEXT_PUBLIC_PLAUSIBLE_NO_PROXY !== "1";

  return (
    <Space direction="vertical" size="large" style={{ width: "100%", padding: 24 }}>
      <Title level={4} style={{ margin: 0 }}>
        <BarChartOutlined /> Site analytics
      </Title>
      <Paragraph type="secondary" style={{ maxWidth: 700, marginBottom: 0 }}>
        Visitor charts live in your analytics provider (this page only embeds a dashboard if you set{" "}
        <Text code>NEXT_PUBLIC_ANALYTICS_DASHBOARD_URL</Text>). The site sends pageviews when{" "}
        <Text code>NEXT_PUBLIC_PLAUSIBLE_DOMAIN</Text> is set on the web service.
      </Paragraph>
      {plausibleDomain ? (
        <>
          <Alert
            type="success"
            showIcon
            message={`Plausible domain (data-domain): ${plausibleDomain}`}
            description={
              proxied
                ? "Using first-party proxy paths /gnpx/s.js and /gnpx/e so ad blockers are less likely to stop the script and beacons."
                : "Direct script (NEXT_PUBLIC_PLAUSIBLE_NO_PROXY=1). Ad blockers may hide some traffic."
            }
          />
          <Space wrap>
            <Button
              type="primary"
              icon={<LineChartOutlined />}
              href="https://plausible.io/sites"
              target="_blank"
              rel="noreferrer"
            >
              Open Plausible (your sites)
            </Button>
            <Button
              href="https://plausible.io/docs/troubleshoot-integration"
              target="_blank"
              rel="noreferrer"
            >
              Troubleshoot integration
            </Button>
          </Space>
          <Alert
            type="warning"
            showIcon
            message="If the dashboard stays empty"
            description={
              <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                <li>
                  In Plausible, add this site with the <strong>exact</strong> hostname:{" "}
                  <Text code>{plausibleDomain}</Text>
                </li>
                <li>
                  Plausible <strong>does not count localhost</strong> — test on your public URL
                </li>
                <li>
                  Disable ad blockers / privacy extensions while testing, or rely on the first-party
                  proxy (default)
                </li>
                <li>
                  In the browser Network tab, after a page load you should see POSTs to{" "}
                  <Text code>/gnpx/e</Text> with status 202 from Plausible (via proxy)
                </li>
              </ul>
            }
          />
        </>
      ) : (
        <Alert
          type="info"
          showIcon
          message="Plausible is not enabled for visitors"
          description="Set NEXT_PUBLIC_PLAUSIBLE_DOMAIN on the web service (e.g. your Render hostname without https) and redeploy."
        />
      )}
      {embed ? (
        <Card size="small" title="Dashboard (embedded)">
          <Paragraph type="secondary" style={{ marginBottom: 12 }}>
            If the dashboard blocks iframes, use “Open in new tab” instead.
          </Paragraph>
          <iframe
            title="Analytics dashboard"
            src={embed}
            style={{
              width: "100%",
              height: "min(70vh, 900px)",
              border: "1px solid var(--ant-color-border, #303030)",
              borderRadius: 8,
            }}
          />
          <div style={{ marginTop: 12 }}>
            <Button href={embed} target="_blank" rel="noreferrer" type="primary">
              Open in new tab
            </Button>
          </div>
        </Card>
      ) : (
        <Paragraph type="secondary">
          Optional: set <Text code>NEXT_PUBLIC_ANALYTICS_DASHBOARD_URL</Text> to a shared dashboard URL
          (e.g. Plausible share link) to show charts here.
        </Paragraph>
      )}
    </Space>
  );
}
