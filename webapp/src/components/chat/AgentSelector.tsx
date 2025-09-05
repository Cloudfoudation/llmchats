// src/components/AgentSelector.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Agent, AgentType } from '@/types/agent';
import { IconRobot, IconUser, IconCloud, IconSettings } from '@tabler/icons-react';
import { useModal } from '@/providers/ModalProvider';
import { useAgentsContext } from '@/providers/AgentsProvider';
import { useTranslations } from 'next-intl';

interface AgentSelectorProps {
    onSelectAgent: (agent: Agent | null) => void;
    currentAgent: Agent | null;
    isOpen: boolean;
    onClose: () => void;
    buttonRef: React.RefObject<HTMLButtonElement | null>;
}

export const AgentSelector: React.FC<AgentSelectorProps> = ({
    onSelectAgent,
    currentAgent,
    isOpen,
    onClose,
    buttonRef,
}) => {
    const t = useTranslations('common');
    const tChat = useTranslations('chat');
    const tAgents = useTranslations('agents');
    const { agents, getCustomAgents, getBedrockAgents } = useAgentsContext();
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const { openAgentManager } = useModal();

    // Get filtered agents by type
    const customAgents = getCustomAgents();
    const bedrockAgents = getBedrockAgents();

    useEffect(() => {
        if (isOpen && buttonRef.current) {
            const buttonRect = buttonRef.current.getBoundingClientRect();
            const dropdownHeight = dropdownRef.current?.offsetHeight || 0;

            // Calculate position above the button
            setPosition({
                top: buttonRect.top - dropdownHeight - 8, // 8px gap
                left: buttonRect.left
            });
        }
    }, [isOpen]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node) &&
                !buttonRef.current?.contains(event.target as Node)
            ) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const getAgentIcon = (agentType: AgentType) => {
        switch (agentType) {
            case 'bedrock':
                return <IconCloud size={16} className="text-blue-500 dark:text-blue-400" />;
            default:
                return <IconRobot size={16} className="text-gray-500 dark:text-gray-400" />;
        }
    };

    // Helper function to render an agent button
    const renderAgentButton = (agent: Agent) => (
        <button
            key={agent.id}
            onClick={() => {
                onSelectAgent(agent);
                onClose();
            }}
            className={`w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md flex items-center 
            space-x-2 ${currentAgent?.id === agent.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
        >
            {getAgentIcon(agent.type || 'custom')}
            <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate text-gray-900 dark:text-gray-100">{agent.name}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {agent.description}
                </div>
            </div>
        </button>
    );

    return (
        <div
            ref={dropdownRef}
            className="fixed w-72 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 overflow-hidden z-50"
            style={{
                top: `${position.top}px`,
                left: `${position.left}px`,
            }}
        >
            <div className="p-2">
                <button
                    onClick={() => {
                        onSelectAgent(null);
                        onClose();
                    }}
                    className={`w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md flex items-center 
                    space-x-2 ${!currentAgent ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                >
                    <IconUser size={16} className="text-gray-500 dark:text-gray-400" />
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{tAgents('noAgents')}</span>
                </button>
                <button
                    onClick={() => {
                        openAgentManager();
                        onClose();
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md flex items-center space-x-2"
                >
                    <IconSettings size={16} className="text-gray-500 dark:text-gray-400" />
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{tAgents('agentManager')}</span>
                </button>
            </div>

            {/* Custom Agents Section */}
            {customAgents.length > 0 && (
                <div className="border-t border-gray-200 dark:border-gray-600">
                    <div className="p-2 text-xs text-gray-500 dark:text-gray-400 font-semibold px-3">{tAgents('title').toUpperCase()}</div>
                    <div className="p-2 max-h-64 overflow-y-auto">
                        {customAgents.map(renderAgentButton)}
                    </div>
                </div>
            )}

            {/* Bedrock Agents Section */}
            {bedrockAgents.length > 0 && (
                <div className="border-t border-gray-200 dark:border-gray-600">
                    <div className="p-2 text-xs text-gray-500 dark:text-gray-400 font-semibold px-3">
                        {tAgents('title').toUpperCase()}
                        <span className="text-blue-400 dark:text-blue-300 ml-1 text-[10px]">AWS MANAGED</span>
                    </div>
                    <div className="p-2 max-h-64 overflow-y-auto">
                        {bedrockAgents.map(renderAgentButton)}
                    </div>
                </div>
            )}

            {agents.length === 0 && (
                <div className="border-t border-gray-200 dark:border-gray-600 px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                    {tAgents('noAgents')}
                </div>
            )}
        </div>
    );
};