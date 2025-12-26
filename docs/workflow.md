# User Workflow

This document details the workflow for using Kitchen. Issues flow through two main phases: Planning and Implementation.

## Workflow Diagram

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant GH as GitHub
    participant O as Orchestrator
    participant P as Planning Agent
    participant I as Implementation Agent

    Note over U,P: Planning Phase

    U->>GH: Move issue to [Planning]
    GH->>O: Webhook (column move)
    O->>P: Spawn agent
    activate P
    P->>P: Analyze issue & repo context

    loop Until plan approved
        alt Needs clarification
            P->>GH: Post questions to issue
            P->>P: Persist state, exit
            deactivate P
            GH->>U: Notification
            U->>GH: Answer questions
            GH->>O: Webhook (comment)
            O->>P: Resume with answers
            activate P
            P->>P: Incorporate answers
        else Plan ready
            P->>GH: Append plan to issue body
            P->>P: Persist state, exit
            deactivate P
            GH->>U: Notification
            alt User has feedback
                U->>GH: Request revisions
                GH->>O: Webhook (comment)
                O->>P: Resume with feedback
                activate P
                P->>P: Revise plan
            else Approved
                U->>GH: Move issue to [Ready for Dev]
                GH->>O: Webhook (column move)
                opt Plan includes sub-issues
                    O->>P: Spawn agent to finalize
                    activate P
                    P->>GH: Create sub-issues (linked to parent)
                    P->>P: Exit
                    deactivate P
                end
                O->>O: Close planning session
            end
        end
    end

    Note over U,I: Implementation Phase

    U->>GH: Move issue to [Implementing]
    GH->>O: Webhook (column move)
    O->>I: Spawn agent
    activate I
    I->>GH: Create branch & draft PR
    I->>I: Analyze plan & codebase

    loop Until PR approved
        alt Needs clarification
            I->>GH: Post questions to PR
            I->>I: Persist state, exit
            deactivate I
            GH->>U: Notification
            U->>GH: Answer questions
            GH->>O: Webhook (comment)
            O->>I: Resume with answers
            activate I
            I->>I: Incorporate answers
        else Implementation ready
            I->>I: Implement changes
            I->>GH: Commit and push
            I->>GH: Update PR body
            I->>I: Persist state, exit
            deactivate I
            GH->>U: Notification
            alt User has feedback
                U->>GH: Request changes on PR
                GH->>O: Webhook (review)
                O->>I: Resume with feedback
                activate I
                I->>I: Address feedback
            else Approved
                U->>GH: Approve & merge PR
                U->>GH: Move issue to [Done]
                GH->>O: Webhook (column move)
                O->>O: Close implementation session
            end
        end
    end
```

## Sub-Issues

Sub-issues independently flow through the same Planning → Implementation cycle. This enables breaking down complex work into manageable pieces while maintaining traceability to the parent issue.

## Key Principles

- **Human-in-the-loop**: Agents never move tickets, merge PRs, or mark work complete
- **Observable**: All agent activity is visible through issue comments and PR updates
- **Iterative**: Users can request revisions at any stage through comments
