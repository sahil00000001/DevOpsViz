import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Eye, EyeOff } from "lucide-react";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PAT_TOKEN_KEY = "azure_devops_pat_token";

export default function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const [patToken, setPatToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (open) {
      const storedToken = localStorage.getItem(PAT_TOKEN_KEY);
      if (storedToken) {
        setPatToken(storedToken);
      }
      setSaved(false);
    }
  }, [open]);

  const handleSave = () => {
    if (patToken.trim()) {
      localStorage.setItem(PAT_TOKEN_KEY, patToken.trim());
      setSaved(true);
      setTimeout(() => {
        onOpenChange(false);
        window.location.reload();
      }, 1000);
    }
  };

  const handleClear = () => {
    localStorage.removeItem(PAT_TOKEN_KEY);
    setPatToken("");
    setSaved(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" data-testid="dialog-settings">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Configure your Azure DevOps Personal Access Token (PAT) to access your project data.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Your PAT token will be stored in browser storage. To create a PAT token, visit your Azure DevOps organization settings.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="pat-token">Personal Access Token</Label>
            <div className="relative">
              <Input
                id="pat-token"
                type={showToken ? "text" : "password"}
                placeholder="Enter your Azure DevOps PAT token"
                value={patToken}
                onChange={(e) => setPatToken(e.target.value)}
                className="pr-10"
                data-testid="input-pat-token"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowToken(!showToken)}
                data-testid="button-toggle-token-visibility"
              >
                {showToken ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Required scopes: Work Items (Read), Code (Read), Project and Team (Read)
            </p>
          </div>

          {saved && (
            <Alert className="bg-green-500/10 border-green-500">
              <AlertDescription className="text-green-400">
                Token saved successfully! Reloading dashboard...
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClear}
            disabled={!patToken}
            data-testid="button-clear-token"
          >
            Clear Token
          </Button>
          <Button
            onClick={handleSave}
            disabled={!patToken.trim()}
            data-testid="button-save-token"
          >
            Save Token
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
