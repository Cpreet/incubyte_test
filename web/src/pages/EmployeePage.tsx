import { type FormEvent, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Pencil } from "lucide-react";
import {
  useCompensationQuery,
  useComponentDefinitionsQuery,
  useCreateComponentMutation,
  useEmployeeQuery,
  useUpdateComponentMutation,
} from "@/api/queries";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { SalaryComponent } from "@/types";
import { formatFrequency, formatMoney } from "@/utils/money";

export function EmployeePage() {
  const { employeeId = "" } = useParams();
  const navigate = useNavigate();

  const employeeQuery = useEmployeeQuery(employeeId);
  const compensationQuery = useCompensationQuery(employeeId);
  const definitionsQuery = useComponentDefinitionsQuery();
  const updateComponent = useUpdateComponentMutation(employeeId);
  const createComponentMutation = useCreateComponentMutation(employeeId);

  const [editingComponent, setEditingComponent] = useState<SalaryComponent | null>(null);
  const [amountDraft, setAmountDraft] = useState("");
  const [amountError, setAmountError] = useState<string | null>(null);

  const [newComponent, setNewComponent] = useState({
    type: "bonus",
    amount: "",
    frequency: "one_time" as SalaryComponent["frequency"],
  });
  const [addError, setAddError] = useState<string | null>(null);

  const employee = employeeQuery.data;
  const compensation = compensationQuery.data;
  const definitions = definitionsQuery.data?.data ?? [];
  const currency = compensation?.package?.nativeCurrency ?? employee?.currency ?? "USD";

  function openEditDialog(component: SalaryComponent) {
    setEditingComponent(component);
    setAmountDraft(String(component.amount));
    setAmountError(null);
  }

  async function saveComponent() {
    if (!editingComponent) return;
    const amount = Number(amountDraft);
    if (!Number.isInteger(amount) || amount < 0) {
      setAmountError("Amount must be a non-negative integer (minor units)");
      return;
    }

    try {
      await updateComponent.mutateAsync({ componentId: editingComponent.id, amount });
      toast.success("Component updated");
      setEditingComponent(null);
    } catch (saveError) {
      setAmountError(saveError instanceof Error ? saveError.message : "Update failed");
    }
  }

  async function onAddComponent(event: FormEvent) {
    event.preventDefault();
    setAddError(null);
    const amount = Number(newComponent.amount);
    if (!Number.isInteger(amount) || amount < 0) {
      setAddError("Amount must be a non-negative integer (minor units)");
      return;
    }

    try {
      await createComponentMutation.mutateAsync({
        type: newComponent.type,
        amount,
        currency,
        frequency: newComponent.frequency,
      });
      toast.success("Component added");
      setNewComponent({ type: "bonus", amount: "", frequency: "one_time" });
    } catch (createError) {
      setAddError(createError instanceof Error ? createError.message : "Create failed");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Button variant="ghost" size="sm" className="mb-2 -ml-2" onClick={() => navigate(-1)}>
          <ArrowLeft className="size-4" />
          Back
        </Button>
        <h1 className="text-xl font-semibold tracking-tight">{employee?.name ?? employeeId}</h1>
        {employee ? (
          <p className="text-sm text-muted-foreground">
            {employee.job} · {employee.location} · {employee.orgUnit} · {employee.level}
          </p>
        ) : null}
      </div>

      {compensation ? (
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Compensation package</CardTitle>
            <span className="text-sm text-muted-foreground">
              Annualized total: {formatMoney(compensation.annualizedTotal, currency)}
            </span>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg ring-1 ring-foreground/10">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {compensation.components.map((component) => (
                    <TableRow key={component.id}>
                      <TableCell className="capitalize">{component.type}</TableCell>
                      <TableCell>{formatMoney(component.amount, component.currency)}</TableCell>
                      <TableCell>{formatFrequency(component.frequency)}</TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" onClick={() => openEditDialog(component)}>
                          <Pencil className="size-3.5" />
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Add component</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-wrap items-end gap-3" onSubmit={onAddComponent}>
            <div className="flex flex-col gap-1.5">
              <Label>Type</Label>
              <Select
                value={newComponent.type}
                onValueChange={(value) => setNewComponent((current) => ({ ...current, type: value }))}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {definitions.map((definition) => (
                    <SelectItem key={definition.code} value={definition.code}>
                      {definition.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Amount (minor units)</Label>
              <Input
                className="w-40"
                value={newComponent.amount}
                onChange={(event) => setNewComponent((current) => ({ ...current, amount: event.target.value }))}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Frequency</Label>
              <Select
                value={newComponent.frequency}
                onValueChange={(value) =>
                  setNewComponent((current) => ({ ...current, frequency: value as SalaryComponent["frequency"] }))
                }
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="annual">Annual</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="one_time">One-time</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" disabled={createComponentMutation.isPending}>
              Add component
            </Button>
          </form>
          {addError ? <p className="mt-2 text-sm text-destructive">{addError}</p> : null}
        </CardContent>
      </Card>

      <Dialog open={editingComponent !== null} onOpenChange={(open) => !open && setEditingComponent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {editingComponent?.type} amount</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-amount">Amount (minor units)</Label>
            <Input
              id="edit-amount"
              value={amountDraft}
              onChange={(event) => setAmountDraft(event.target.value)}
              aria-invalid={amountError !== null}
            />
            {amountError ? <p className="text-sm text-destructive">{amountError}</p> : null}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingComponent(null)}>
              Cancel
            </Button>
            <Button onClick={() => void saveComponent()} disabled={updateComponent.isPending}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
