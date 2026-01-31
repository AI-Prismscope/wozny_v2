
import React from 'react';
import { useWoznyStore } from '@/lib/store/useWoznyStore';
import { ShieldCheck, Cpu, MessageSquare, Wrench, FileInput, FileOutput, Search, Activity, HelpCircle, Wand2 } from 'lucide-react';

export const AboutView = () => {
    return (
        <div className="h-full overflow-y-auto bg-neutral-50 dark:bg-neutral-900">
            <div className="max-w-5xl mx-auto py-12 px-6">

                {/* Hero / Mission */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-16">
                    {/* Left: Text */}
                    <div className="text-left space-y-4">
                        <h1 className="text-4xl font-extrabold text-neutral-900 dark:text-white tracking-tight">
                            Your Intelligent, Local-First Data Workshop
                        </h1>
                        <p className="text-xl text-neutral-600 dark:text-neutral-300">
                            Wozny combines the speed of local processing with the power of AI—without your sensitive data ever leaving your browser.
                        </p>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex flex-col items-center justify-center gap-6">
                        <div className="flex items-center gap-2 px-3 py-1 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 rounded-full text-sm font-medium">
                            <ShieldCheck className="w-4 h-4" />
                            100% Private (Local Execution)
                        </div>
                        <button
                            onClick={() => useWoznyStore.getState().setActiveTab('upload')}
                            className="flex items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-full shadow-lg transition-all hover:scale-105"
                        >
                            <FileInput className="w-5 h-5" />
                            Get Started - Upload CSV
                        </button>
                    </div>
                </div>

                {/* The Three Layers of Intelligence */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
                    <FeatureCard
                        icon={Activity}
                        color="text-blue-500"
                        title="The Analyst"
                        description="Instantly scans your CSV for missing values, duplicates, and formatting issues. Features Type-Aware Smart Sorting and Disciplined Smart Split."
                    />
                    <FeatureCard
                        icon={Cpu}
                        color="text-purple-500"
                        title="The Brain"
                        description="Uses client-side Machine Learning to find semantic patterns, grouping variations like 'Google' and 'Google Inc' automatically."
                    />
                    <FeatureCard
                        icon={MessageSquare}
                        color="text-pink-500"
                        title="The Assistant"
                        description="Talk to your data naturally. 'Ask Wozny' uses an embedded LLM to filter, search, and reason about your information."
                    />
                </div>

                {/* Workflow Stepper */}
                <div className="bg-white dark:bg-black rounded-2xl border border-neutral-200 dark:border-neutral-800 p-8 shadow-sm">
                    <h2 className="text-2xl font-bold text-center mb-10">How It Works</h2>

                    <div className="relative flex flex-col md:flex-row justify-between items-center gap-8 md:gap-4">
                        {/* Connector Line (Desktop) */}
                        <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-neutral-100 dark:bg-neutral-800 -z-10 -translate-y-1/2" />

                        <Step
                            icon={FileInput}
                            step="1"
                            title="Upload"
                            desc="Drag & Drop your CSV"
                        />
                        <Step
                            icon={Search}
                            step="2"
                            title="Review Insights"
                            desc="Health Score & Smart Analysis"
                        />
                        <Step
                            icon={Wand2}
                            step="3"
                            title="Ask Wozny"
                            desc="NLP Filtering & Search"
                        />
                        <Step
                            icon={Wrench}
                            step="4"
                            title="Fix in Workshop"
                            desc="Clean, Format, Smart Split, & Edit"
                        />
                        <Step
                            icon={FileOutput}
                            step="5"
                            title="Export"
                            desc="Download Clean Data"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-16 text-center text-sm text-neutral-400">
                    <p>Wozny V2 • Built with Next.js, WebGPU & Transformers.js</p>
                </div>
            </div>
        </div>
    );
};

const FeatureCard = ({ icon: Icon, color, title, description }: any) => (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 rounded-xl hover:shadow-md transition-shadow">
        <div className={`w-12 h-12 rounded-lg bg-neutral-50 dark:bg-neutral-800 flex items-center justify-center mb-4 ${color}`}>
            <Icon className="w-6 h-6" />
        </div>
        <h3 className="text-xl font-bold mb-2 text-neutral-900 dark:text-white">{title}</h3>
        <p className="text-neutral-500 dark:text-neutral-400 leading-relaxed">
            {description}
        </p>
    </div>
);

const Step = ({ icon: Icon, step, title, desc }: any) => (
    <div className="flex flex-col items-center text-center bg-white dark:bg-black p-4 rounded-xl min-w-[160px]">
        <div className="w-14 h-14 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-black flex items-center justify-center mb-4 shadow-lg">
            <Icon className="w-6 h-6" />
        </div>
        <div className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-1">Step {step}</div>
        <h3 className="font-bold text-lg mb-1">{title}</h3>
        <p className="text-sm text-neutral-500">{desc}</p>
    </div>
);
