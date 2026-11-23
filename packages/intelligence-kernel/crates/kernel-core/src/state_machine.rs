//! Strict Lifecycle State Transitions
#![forbid(unsafe_code)]

use kernel_types::LifecycleState;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct StateTransitionError {
    pub from: LifecycleState,
    pub to: LifecycleState,
    pub reason: String,
}

pub fn can_transition(
    from: LifecycleState,
    to: LifecycleState,
) -> Result<(), StateTransitionError> {
    let valid = match (from, to) {
        (LifecycleState::Ingested, LifecycleState::Normalized) => true,
        (LifecycleState::Normalized, LifecycleState::Correlated) => true,
        (LifecycleState::Correlated, LifecycleState::Analyzed) => true,
        (LifecycleState::Analyzed, LifecycleState::Validating) => true,
        (LifecycleState::Validating, LifecycleState::Validated) => true,
        (LifecycleState::Validating, LifecycleState::Rejected) => true,
        (LifecycleState::Validated, LifecycleState::Governed) => true,
        (LifecycleState::Governed, LifecycleState::Publishable) => true,
        (LifecycleState::Publishable, LifecycleState::Published) => true,
        (LifecycleState::Published, LifecycleState::Superseded) => true,
        // Terminal or rejection states
        (_, LifecycleState::Rejected) => true,
        _ => false,
    };

    if valid {
        Ok(())
    } else {
        Err(StateTransitionError {
            from,
            to,
            reason: format!("Illegal lifecycle transition from {:?} to {:?}", from, to),
        })
    }
}
