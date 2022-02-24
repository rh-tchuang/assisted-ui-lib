import * as React from 'react';
import { DropdownItem } from '@patternfly/react-core';
import { noop } from 'lodash';

import { Host } from '../../../common/api/types';
import { discoveryTypeColumn, agentStatusColumn, useAgentsTable } from '../Agent/tableUtils';
import HostsTable, {
  DefaultExpandComponent,
  HostsTableEmptyState,
} from '../../../common/components/hosts/HostsTable';
import {
  cpuCoresColumn,
  discoveredAtColumn,
  disksColumn,
  hostnameColumn,
  memoryColumn,
  roleColumn,
} from '../../../common/components/hosts/tableUtils';
import {
  DiscoveryTroubleshootingModal,
  HostToolbar,
  ChangeHostnameAction,
  MassChangeHostnameModal,
} from '../../../common';
import { ClusterDeploymentHostsTablePropsActions } from '../ClusterDeployment/types';
import MassApproveAgentModal from '../modals/MassApproveAgentModal';
import { ActionItemsContext } from '../../../common/components/hosts/HostToolbar';
import { AgentK8sResource, BareMetalHostK8sResource, InfraEnvK8sResource } from '../../types';
import { MassChangeHostnameModalProps } from '../../../common/components/hosts/MassChangeHostnameModal';

type MassApproveActionProps = {
  onApprove: VoidFunction;
  selectedAgents: AgentK8sResource[];
};

const MassApproveAction: React.FC<MassApproveActionProps> = ({ onApprove, selectedAgents }) => {
  const isDisabled = React.useContext(ActionItemsContext);

  let disabledDescription = isDisabled ? 'Select one or more hosts to approve' : undefined;
  if (selectedAgents.every((a) => a.spec.approved)) {
    disabledDescription = 'All selected hosts are already approved';
  }
  return (
    <DropdownItem
      onClick={onApprove}
      isDisabled={!!disabledDescription}
      description={disabledDescription}
    >
      Approve
    </DropdownItem>
  );
};

export type ClusterDeploymentHostDiscoveryTableProps = ClusterDeploymentHostsTablePropsActions & {
  agents: AgentK8sResource[];
  bareMetalHosts: BareMetalHostK8sResource[];
  infraEnv: InfraEnvK8sResource;
  className?: string;
  onChangeHostname: (agent: AgentK8sResource, hostname: string) => Promise<AgentK8sResource>;
  onChangeBMHHostname: (
    bmh: BareMetalHostK8sResource,
    hostname: string,
  ) => Promise<BareMetalHostK8sResource>;
  onApprove?: (agents: AgentK8sResource) => Promise<AgentK8sResource>;
};

const ClusterDeploymentHostDiscoveryTable: React.FC<ClusterDeploymentHostDiscoveryTableProps> = ({
  agents,
  className,
  bareMetalHosts,
  infraEnv,
  onApprove,
  onChangeHostname,
  onChangeBMHHostname,
  onEditHost,
  canEditRole,
  onEditRole,
}) => {
  const [isDiscoveryHintModalOpen, setDiscoveryHintModalOpen] = React.useState(false);
  const [isMassChangeHostOpen, setMassChangeHostOpen] = React.useState(false);
  const [isMassApproveOpen, setMassApproveOpen] = React.useState(false);
  const [selectedHostIDs, setSelectedHostIDs] = React.useState<string[]>([]);
  const onSelect = (host: Host, isSelected: boolean) => {
    if (isSelected) {
      setSelectedHostIDs([...selectedHostIDs, host.id]);
    } else {
      setSelectedHostIDs(selectedHostIDs.filter((sa) => sa !== host.id));
    }
  };

  const [hosts, hostActions, actionResolver] = useAgentsTable(
    {
      agents,
      bmhs: bareMetalHosts,
      infraEnv,
    },
    { onEditHost, canEditRole, onEditRole },
  );
  const content = React.useMemo(
    () =>
      [
        hostnameColumn(hostActions.onEditHost),
        discoveryTypeColumn(agents, bareMetalHosts),
        agentStatusColumn({
          agents,
          bareMetalHosts,
          onEditHostname: onEditHost,
          onApprove,
          wizardStepId: 'hosts-discovery',
        }),
        roleColumn(hostActions.canEditRole, hostActions.onEditRole),
        discoveredAtColumn,
        cpuCoresColumn,
        memoryColumn,
        disksColumn,
      ].filter(Boolean),
    [agents, hostActions, bareMetalHosts, onApprove, onEditHost],
  );

  const hostIDs = hosts.map((h) => h.id);
  const selectedAgents = agents.filter((a) => selectedHostIDs.includes(a.metadata?.uid || ''));

  const massActions = [
    <ChangeHostnameAction
      key="hostname"
      onChangeHostname={() => setMassChangeHostOpen(!isMassChangeHostOpen)}
    />,
  ];
  if (onApprove) {
    massActions.push(
      <MassApproveAction
        key="approve"
        onApprove={() => setMassApproveOpen(!isMassApproveOpen)}
        selectedAgents={selectedAgents}
      />,
    );
  }

  const onAgentChangeHostname: MassChangeHostnameModalProps['onChangeHostname'] = async (
    host,
    hostname,
  ) => {
    const agent = agents.find((a) => a.metadata?.uid === host.id);
    if (agent) {
      return onChangeHostname(agent, hostname);
    } else {
      const bmh = bareMetalHosts.find((bmh) => bmh.metadata?.uid === host.id);
      return bmh ? onChangeBMHHostname(bmh, hostname) : noop;
    }
  };

  return (
    <>
      <HostToolbar
        hostIDs={hostIDs}
        selectedHostIDs={selectedHostIDs}
        onSelectNone={() => setSelectedHostIDs([])}
        onSelectAll={() => setSelectedHostIDs(hostIDs)}
        actionItems={massActions}
      />
      <HostsTable
        hosts={hosts}
        content={content}
        actionResolver={actionResolver}
        className={className}
        selectedIDs={selectedHostIDs}
        setSelectedHostIDs={setSelectedHostIDs}
        onSelect={onSelect}
        ExpandComponent={DefaultExpandComponent}
      >
        <HostsTableEmptyState setDiscoveryHintModalOpen={setDiscoveryHintModalOpen} />
      </HostsTable>
      <DiscoveryTroubleshootingModal
        isOpen={isDiscoveryHintModalOpen}
        setDiscoveryHintModalOpen={setDiscoveryHintModalOpen}
      />
      <MassChangeHostnameModal
        isOpen={isMassChangeHostOpen}
        hosts={hosts}
        selectedHostIDs={selectedHostIDs}
        onChangeHostname={onAgentChangeHostname}
        onClose={() => setMassChangeHostOpen(false)}
      />
      {onApprove && (
        <MassApproveAgentModal
          isOpen={isMassApproveOpen}
          agents={selectedAgents}
          onApprove={onApprove}
          onClose={() => setMassApproveOpen(false)}
        />
      )}
    </>
  );
};

export default ClusterDeploymentHostDiscoveryTable;