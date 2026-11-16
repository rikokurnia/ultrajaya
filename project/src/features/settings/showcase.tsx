"use client";
import { useState } from "react";
import { FileText } from "lucide-react";
import {
  PageHeader,
  Card,
  Button,
  Input,
  Select,
  Field,
  KpiCard,
  DataTable,
  StatusBadge,
  ApprovalTimeline,
  Currency,
  Quantity,
  DateDisplay,
} from "@/components/ui";
import { DetailDrawer, ConfirmDialog } from "@/components/ui/overlays";
export function Showcase() {
  const [confirmed, setConfirmed] = useState(false);
  return (
    <>
      <PageHeader
        title="Component showcase"
        description="Development reference for the Ultrajaya shared design system"
        concept
      />
      <div className="showcase-grid">
        <Card>
          <h2>Fields and actions</h2>
          <Field id="showcase-input" label="Document reference">
            <Input id="showcase-input" placeholder="PO-261029-0045" />
          </Field>
          <Field id="showcase-status" label="Status">
            <Select id="showcase-status">
              <option>All statuses</option>
              <option>Approved</option>
            </Select>
          </Field>
          <Field
            id="showcase-error"
            label="Validation feedback"
            error="Enter a document reference."
          >
            <Input
              id="showcase-error"
              aria-invalid
              aria-describedby="showcase-error-error"
            />
          </Field>
          <div className="button-row">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button disabled>Disabled</Button>
          </div>
        </Card>
        <Card>
          <h2>Status and formatting</h2>
          <div className="button-row">
            {(["neutral", "info", "success", "warning", "danger"] as const).map(
              (tone, i) => (
                <StatusBadge
                  key={tone}
                  tone={tone}
                  status={
                    ["DRAFT", "OPEN", "APPROVED", "AWAITING_APPROVAL", "HELD"][
                      i
                    ]
                  }
                />
              ),
            )}
          </div>
          <p>
            <Currency minor={16000000000} />
          </p>
          <p>
            <Quantity value="7800" unit="kg" />
          </p>
          <p>
            <DateDisplay value="2026-10-29T03:20:00Z" time />
          </p>
          <KpiCard
            label="Sample invoice"
            value={<Currency minor={16000000000} />}
            hint="Concept • Simulated Data"
            icon={<FileText />}
          />
        </Card>
        <Card>
          <h2>Overlays and timeline</h2>
          <div className="button-row">
            <DetailDrawer
              trigger={<Button variant="secondary">Open detail drawer</Button>}
              title="Example detail"
              description="Concept • Simulated Data"
            >
              <p>Module details belong here.</p>
            </DetailDrawer>
            <ConfirmDialog
              trigger={<Button variant="danger">Open confirmation</Button>}
              title="Confirm example action?"
              description="This demonstration only updates the text below."
              onConfirm={() => setConfirmed(true)}
            />
          </div>
          {confirmed && <p role="status">Example action confirmed.</p>}
          <ApprovalTimeline
            steps={[
              {
                id: "one",
                name: "Purchasing review",
                description: "Approved • 29 Oct 2026",
                status: "approved",
              },
              {
                id: "two",
                name: "Assigned approver",
                description: "Awaiting authorized decision",
                status: "pending",
              },
            ]}
          />
        </Card>
        <Card>
          <h2>Table states</h2>
          <DataTable
            rows={[]}
            rowKey={() => ""}
            columns={[
              { key: "reference", label: "Reference", render: () => "" },
            ]}
            state="loading"
          />
          <DataTable
            rows={[]}
            rowKey={() => ""}
            columns={[
              { key: "reference", label: "Reference", render: () => "" },
            ]}
          />
          <DataTable
            rows={[]}
            rowKey={() => ""}
            columns={[]}
            state="error"
            error="Example connection error."
            retry={<Button variant="secondary">Retry example</Button>}
          />
        </Card>
      </div>
    </>
  );
}
