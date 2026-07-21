import { useStore } from '../store/useStore';
import { AuditLogAction, AuditLogModule, ApprovalRequest, EventSeverity } from '../types';

export const SAFE_ACTIONS = {
  CAN_DELETE_DATA: false,
  CAN_SEND_EMAIL_MOCK: true,
  CAN_MODIFY_CALENDAR_MOCK: true,
  CLI_EXECUTION_REAL: false,
  STORE_TOKENS_LOCAL_STORAGE: false
};

// Abstract service to enforce safety and generate audit logs automatically
export const SystemService = {
  logAction: (action: AuditLogAction, module: AuditLogModule, summary: string, actor: string = 'user', severity: EventSeverity = 'info', entityId?: string) => {
    useStore.getState().addAuditLog({
      action,
      module,
      summary,
      actor,
      severity,
      entityId
    });
  },

  requestApproval: (actionType: ApprovalRequest['actionType'], description: string, riskLevel: ApprovalRequest['riskLevel'], payload?: any) => {
    useStore.getState().addApproval({
      actionType,
      description,
      requester: 'agent', // can be user or agent
      status: 'pending',
      riskLevel,
      payload
    });
    
    // Log the request
    SystemService.logAction('workspace_action', 'system', `Requested approval for: ${description}`, 'agent', 'warning');
  },
  
  approveAction: (id: string) => {
    useStore.getState().updateApproval(id, { status: 'approved' });
    const approval = useStore.getState().approvals.find(a => a.id === id);
    if (approval) {
      SystemService.logAction('workspace_action', 'system', `Approved action: ${approval.description}`, 'user', 'info');
    }
  },

  rejectAction: (id: string) => {
    useStore.getState().updateApproval(id, { status: 'rejected' });
    const approval = useStore.getState().approvals.find(a => a.id === id);
    if (approval) {
      SystemService.logAction('workspace_action', 'system', `Rejected action: ${approval.description}`, 'user', 'warning');
    }
  }
};
