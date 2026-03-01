"use client";
import { useEffect, useState } from 'react';
import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';

export default function OnboardingTour() {
    const [isMounted, setIsMounted] = useState(false);
    const [run, setRun] = useState(false);

    // Auto-start the tour if not seen this session
    useEffect(() => {
        setIsMounted(true);
        const hasSeenTour = sessionStorage.getItem('anukriti_tour_seen');
        if (!hasSeenTour) {
            setRun(true);
        }
    }, []);

    const steps: Step[] = [
        {
            target: '.tour-step-1-new-twin',
            content: (
                <div className="text-left space-y-2">
                    <h3 className="text-lg font-bold text-accent-cyan">1. Initialize Artifact</h3>
                    <p className="text-sm text-gray-300">Start here. Click this button to define the name and high-level description of the new digital twin you want to generate.</p>
                </div>
            ),
            disableBeacon: true,
            placement: 'bottom-end',
        },
        {
            target: '.tour-step-2-projects',
            content: (
                <div className="text-left space-y-2">
                    <h3 className="text-lg font-bold text-accent-cyan">2. Project Registry</h3>
                    <p className="text-sm text-gray-300">All your active digital twins and simulations will be tracked here. Select an active project to continue the pipeline.</p>
                </div>
            ),
            placement: 'top',
        },
        {
            target: '.tour-nav-step-requirements',
            content: (
                <div className="text-left space-y-2">
                    <h3 className="text-lg font-bold text-accent-cyan">3. Requirements Analysis</h3>
                    <p className="text-sm text-gray-300">Our LLM engine will break down your project prompt into specific physical constraints, thresholds, and operational limits.</p>
                </div>
            ),
            placement: 'right',
        },
        {
            target: '.tour-nav-step-architecture',
            content: (
                <div className="text-left space-y-2">
                    <h3 className="text-lg font-bold text-accent-cyan">4. Map Architecture</h3>
                    <p className="text-sm text-gray-300">Visualize the physical and logical components of your device as an interactive, connected topology graph.</p>
                </div>
            ),
            placement: 'right',
        },
        {
            target: '.tour-nav-step-simulation',
            content: (
                <div className="text-left space-y-2">
                    <h3 className="text-lg font-bold text-accent-cyan">5. Physics Simulation</h3>
                    <p className="text-sm text-gray-300">Run math-based telemetry simulations based on your constraints, and train a resilient Machine Learning Surrogate Model.</p>
                </div>
            ),
            placement: 'right',
        },
        {
            target: '.tour-nav-step-digital-twins',
            content: (
                <div className="text-left space-y-2">
                    <h3 className="text-lg font-bold text-accent-cyan">6. 3D Generative Mesh</h3>
                    <p className="text-sm text-gray-300">Finally, autonomously generate and view an interactive 3D Model of your physical engineering system via Meshy AI.</p>
                </div>
            ),
            placement: 'right',
        },
    ];

    const handleJoyrideCallback = (data: CallBackProps) => {
        const { status } = data;
        const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

        if (finishedStatuses.includes(status)) {
            setRun(false);
            sessionStorage.setItem('anukriti_tour_seen', 'true');
        }
    };

    if (!isMounted) return null;

    return (
        <Joyride
            steps={steps}
            run={run}
            continuous={true}
            showProgress={true}
            showSkipButton={true}
            callback={handleJoyrideCallback}
            styles={{
                options: {
                    arrowColor: '#0b0f14',
                    backgroundColor: '#0b0f14',
                    overlayColor: 'rgba(0, 0, 0, 0.7)',
                    primaryColor: '#61dafb', // accent-cyan
                    textColor: '#ffffff',
                    zIndex: 1000,
                },
                tooltipContainer: {
                    textAlign: 'left',
                },
                tooltip: {
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    padding: '20px',
                },
                buttonNext: {
                    backgroundColor: 'rgba(97, 218, 251, 0.1)',
                    color: '#61dafb',
                    border: '1px solid rgba(97, 218, 251, 0.3)',
                    borderRadius: '8px',
                    padding: '8px 16px',
                },
                buttonBack: {
                    color: '#9ca3af',
                    marginRight: 10,
                },
                buttonSkip: {
                    color: '#ff5555',
                    fontSize: '14px',
                }
            }}
            locale={{ last: 'Finish', skip: 'Skip', next: 'Next' }}
        />
    );
}
