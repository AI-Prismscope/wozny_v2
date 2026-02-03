import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'warning' | 'neutral';
    isProcessing?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    variant = 'neutral',
    isProcessing = false
}) => {
    if (!isOpen) return null;

    const getVariantStyles = () => {
        switch (variant) {
            case 'danger':
                return {
                    iconBg: 'bg-red-100 dark:bg-red-900/30',
                    iconColor: 'text-red-600 dark:text-red-400',
                    confirmBtn: 'bg-red-600 hover:bg-red-700 text-white border-transparent'
                };
            case 'warning':
                return {
                    iconBg: 'bg-yellow-100 dark:bg-yellow-900/30',
                    iconColor: 'text-yellow-600 dark:text-yellow-400',
                    confirmBtn: 'bg-yellow-600 hover:bg-yellow-700 text-white border-transparent'
                };
            default:
                return {
                    iconBg: 'bg-neutral-100 dark:bg-neutral-800',
                    iconColor: 'text-neutral-600 dark:text-neutral-400',
                    confirmBtn: 'bg-neutral-900 dark:bg-white hover:bg-neutral-800 text-white dark:text-black border-transparent'
                };
        }
    };

    const styles = getVariantStyles();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
                onClick={!isProcessing ? onClose : undefined}
            />

            {/* Dialog Panel */}
            <div className="relative bg-white dark:bg-neutral-900 rounded-lg shadow-xl max-w-md w-full border border-neutral-200 dark:border-neutral-800 transform transition-all p-6">

                {/* Close Button */}
                <button
                    onClick={onClose}
                    disabled={isProcessing}
                    className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-500 dark:hover:text-neutral-300 transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-full flex-shrink-0 ${styles.iconBg}`}>
                        <AlertTriangle className={`w-6 h-6 ${styles.iconColor}`} />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">
                            {title}
                        </h3>
                        <p className="text-sm text-neutral-500 leading-relaxed">
                            {description}
                        </p>
                    </div>
                </div>

                <div className="mt-8 flex items-center justify-end gap-3">
                    <button
                        onClick={onClose}
                        disabled={isProcessing}
                        className="px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isProcessing}
                        className={`px-4 py-2 text-sm font-medium rounded-lg shadow-sm transition-colors border ${styles.confirmBtn} disabled:opacity-50 flex items-center gap-2`}
                    >
                        {isProcessing ? 'Processing...' : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};
