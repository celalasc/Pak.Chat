// Test script to compare control panel buttons between main chat page and project page
// This script should be run in the browser console

function testControlPanelButtons() {
    console.log('=== Testing Control Panel Buttons ===');
    
    // Function to test button properties
    function testButton(buttonName, selector) {
        const button = document.querySelector(selector);
        if (!button) {
            console.error(`❌ ${buttonName} button not found with selector: ${selector}`);
            return null;
        }
        
        const computedStyle = window.getComputedStyle(button);
        const rect = button.getBoundingClientRect();
        
        return {
            name: buttonName,
            element: button,
            visible: rect.width > 0 && rect.height > 0,
            clickable: !button.disabled,
            styles: {
                backgroundColor: computedStyle.backgroundColor,
                borderColor: computedStyle.borderColor,
                borderRadius: computedStyle.borderRadius,
                padding: computedStyle.padding,
                width: computedStyle.width,
                height: computedStyle.height,
                backdropFilter: computedStyle.backdropFilter,
                zIndex: computedStyle.zIndex
            },
            classes: button.className,
            ariaLabel: button.getAttribute('aria-label'),
            position: {
                top: rect.top,
                right: rect.right,
                bottom: rect.bottom,
                left: rect.left
            }
        };
    }
    
    // Test control panel container
    const controlPanel = document.querySelector('.fixed.right-4.top-4.z-50.flex.gap-2');
    if (!controlPanel) {
        console.error('❌ Control panel container not found');
        return;
    }
    
    console.log('✅ Control panel container found');
    console.log('Control panel styles:', window.getComputedStyle(controlPanel));
    
    // Test individual buttons
    const buttons = [
        {
            name: 'New Chat',
            selector: 'button[aria-label="Create new chat"]'
        },
        {
            name: 'History',
            selector: 'button[aria-label="Open chat history"]'
        },
        {
            name: 'Settings',
            selector: 'button[aria-label="Open settings"]'
        }
    ];
    
    const buttonResults = buttons.map(btn => testButton(btn.name, btn.selector));
    
    // Display results
    console.log('\n=== Button Test Results ===');
    buttonResults.forEach(result => {
        if (result) {
            console.log(`✅ ${result.name} Button:`, {
                visible: result.visible,
                clickable: result.clickable,
                styles: result.styles,
                classes: result.classes,
                ariaLabel: result.ariaLabel
            });
        }
    });
    
    // Test mobile responsive behavior
    console.log('\n=== Testing Mobile Responsive Behavior ===');
    const currentWidth = window.innerWidth;
    console.log(`Current viewport width: ${currentWidth}px`);
    
    // Check if mobile breakpoint is active
    const isMobile = currentWidth < 768; // Assuming md breakpoint
    console.log(`Mobile view: ${isMobile ? 'Yes' : 'No'}`);
    
    // Test button functionality
    console.log('\n=== Testing Button Functionality ===');
    buttonResults.forEach(result => {
        if (result && result.element) {
            const button = result.element;
            
            // Check for tooltip
            const tooltip = button.closest('[data-tooltip]') || button.querySelector('[data-tooltip]');
            console.log(`${result.name} has tooltip: ${tooltip ? 'Yes' : 'No'}`);
            
            // Check for hover states
            button.addEventListener('mouseenter', () => {
                console.log(`${result.name} button hover state activated`);
            });
            
            // Test click functionality (non-invasive)
            console.log(`${result.name} button click handler: ${button.onclick ? 'Present' : 'Not present'}`);
        }
    });
    
    return {
        controlPanel,
        buttons: buttonResults,
        isMobile,
        currentWidth
    };
}

// Function to compare with main chat page
function compareWithMainChatPage() {
    console.log('\n=== Comparison Instructions ===');
    console.log('1. Run this script on the main chat page (/chat)');
    console.log('2. Save the results');
    console.log('3. Run this script on the project page (/project/[id])');
    console.log('4. Compare the results to ensure consistency');
    
    const currentPath = window.location.pathname;
    console.log(`Current page: ${currentPath}`);
    
    if (currentPath.includes('/project/')) {
        console.log('📋 Testing PROJECT PAGE control panel');
    } else if (currentPath.includes('/chat')) {
        console.log('📋 Testing MAIN CHAT PAGE control panel');
    } else {
        console.log('⚠️  Unknown page type');
    }
}

// Run the tests
console.log('Starting control panel button tests...');
compareWithMainChatPage();
const results = testControlPanelButtons();

// Test responsive behavior by simulating different viewport sizes
function testResponsiveBreakpoints() {
    console.log('\n=== Testing Responsive Breakpoints ===');
    
    const breakpoints = [
        { name: 'Mobile', width: 375 },
        { name: 'Tablet', width: 768 },
        { name: 'Desktop', width: 1024 },
        { name: 'Large Desktop', width: 1920 }
    ];
    
    breakpoints.forEach(bp => {
        console.log(`\n${bp.name} (${bp.width}px):`);
        // Note: This would require actual viewport resizing in a real test
        console.log(`At ${bp.width}px width, buttons should be ${bp.width < 768 ? 'hidden/modified' : 'visible'}`);
    });
}

testResponsiveBreakpoints();

console.log('\n=== Manual Testing Checklist ===');
console.log('✓ Check button visibility on both pages');
console.log('✓ Test button hover states');
console.log('✓ Test button click functionality');
console.log('✓ Test mobile responsive behavior');
console.log('✓ Compare button styling consistency');
console.log('✓ Test tooltip functionality');
console.log('✓ Test keyboard navigation');
