// HeaderActions.tsx
'use client'
import { useSettingsContext } from '@/providers/SettingsProvider';
import { IconChevronDown } from '@tabler/icons-react';
import { useState, useRef, useEffect } from 'react';
import { useAuthContext } from '@/providers/AuthProvider';
import { ThemeToggle } from '@/components/ThemeToggle';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export const HeaderActions = () => {
	const { settings, switchRegion } = useSettingsContext();
	const [isOpen, setIsOpen] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);
	const { isSwitchRegionLoading } = useAuthContext();

	const availableRegions = Array.from(
		// new Set(MODELS.flatMap(model => model.regions))
		new Set(['us-east-1', 'us-west-2'])
	).sort();

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
				setIsOpen(false);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, []);

	return (
		<div className="flex items-center gap-2 sm:gap-4">
			<LanguageSwitcher />
			<ThemeToggle />
			<div className="relative min-w-[120px]" ref={dropdownRef}>
				<button
					onClick={() => setIsOpen(!isOpen)}
					className="flex w-full items-center justify-between rounded px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
					aria-expanded={isOpen}
					aria-haspopup="listbox"
				>
					{isSwitchRegionLoading ? "changing..." : settings.region}
					<IconChevronDown
						className={`ml-1 h-4 w-4 text-gray-400 stroke-[1.5] transition-transform ${isOpen ? 'rotate-180' : ''}`}
						aria-hidden="true"
					/>
				</button>

				{isOpen && (
					<ul
						className="absolute mt-1 max-h-60 w-full overflow-auto rounded bg-white py-1 shadow-lg dark:bg-gray-800"
						role="listbox"
					>
						{availableRegions.map(region => (
							<li
								key={region}
								onClick={() => {
									switchRegion(region);
									setIsOpen(false);
								}}
								className={`cursor-pointer px-2 py-1 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${settings.region === region
									? 'text-blue-600 dark:text-blue-400'
									: 'text-gray-600 dark:text-gray-300'
									}`}
								role="option"
								aria-selected={settings.region === region}
							>
								{region}
							</li>
						))}
					</ul>
				)}
			</div>
		</div>
	);
};