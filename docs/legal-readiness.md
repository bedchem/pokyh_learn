# Pokyh Learn — Italy / WebUntis production-readiness record

This is an operational release checklist, not legal advice and not evidence
that an integration is lawful by itself. The controller, school and, where
applicable, their data-protection officer or legal adviser must review and
approve the actual deployment before production access is enabled.

## What the software enforces

- Learn has no separate local account path. `POST /auth/learn-login` accepts a
  sign-in only after the existing backend confirms WebUntis credentials and
  the canonical Pokyh account is marked as a confirmed WebUntis user.
- The browser sends credentials only to the same-origin Learn BFF over HTTPS;
  it does not persist them in browser storage. The BFF forwards the request
  server-to-server; the backend does not log or store the password.
- In production, the backend defaults `LEARN_LEGAL_GATE_ENABLED` to `true`.
  The sign-in endpoint returns a safe unavailable response until all of these
  are configured: a non-secret approval reference, an HTTPS privacy-notice
  URL, and a privacy-notice version. The user must acknowledge that same
  version before credentials are verified.
- The notice at `pokyh.com/legal?view=learn` describes the intended data
  minimisation, purposes, recipients, rights and activation condition in
  Italian, German and English. It intentionally states that a checkbox does
  not replace the controller's legal basis or WebUntis authorisation.
- Optional dictionary lookup is disabled by default. When an authorised editor
  explicitly requests it, only the word and requested language pair may leave
  Pokyh; it must never receive credentials, user profiles, tokens or learning
  history.

## Operator checklist before enabling production sign-in

1. Identify the controller and publish accurate contact details, including the
   privacy-contact/DPO route where one applies.
2. Obtain and retain the responsible school's or controller's documented
   permission for the WebUntis integration. Put a non-secret internal reference
   in `LEARN_WEBUNTIS_AUTHORIZATION_REFERENCE`; do not put contracts or
   personal data in environment variables.
3. Determine and document the lawful basis, roles and, where required, the
   processor arrangement under Article 28 GDPR. A learner's acknowledgement is
   transparency evidence only; it is not a substitute for this step.
4. Complete the Article 13 privacy notice with the real controller, purposes,
   data categories, recipients, retention periods, rights, complaint route,
   transfers and automated-decision information. Publish it over HTTPS and set
   the matching version in both frontend and backend configuration.
5. Review the actual hosting, backup, Cloudflare/reverse-proxy, database,
   logging, support-access and dictionary-provider arrangements. Record every
   recipient/subprocessor and any international transfer mechanism.
6. Set a documented retention/deletion process for Learn content, attempts,
   access grants, audit records, backups and export requests. Test a
   data-subject request through the real operational process.
7. Confirm that cookies and analytics are limited to what is necessary. Add a
   compliant consent flow before enabling any non-essential analytics,
   marketing, fingerprinting or third-party media.
8. Complete a security assessment of the deployed configuration: HTTPS,
   secret rotation, CORS origins, cookie scope, firewall/proxy, rate limits,
   monitoring, incident response and restore test.
9. Have the controller/school and qualified legal/privacy reviewer approve the
   release record. Then set the production configuration and verify the admin
   console reports the legal gate as ready—without exposing the approval
   reference or secrets.

## Sources for the review

- [GDPR — Regulation (EU) 2016/679, including Articles 13 and 28](https://eur-lex.europa.eu/eli/reg/2016/679/oj/?locale=it)
- [Italian Garante: transparency under GDPR](https://www.garanteprivacy.it/temi/trasparenza-ai-sensi-del-gdpr)
- [Untis: privacy information for WebUntis integrations](https://www.untis.at/datenschutz-wu-integrationen)

These sources support the review process; they do not replace tailored advice
for a particular school, controller, contract, hosting arrangement or data
flow.

## Release evidence to record

Record the completed review, date, responsible approver, notice version,
non-secret approval-reference identifier, deployment environment, test result
and any outstanding condition in a dated `docs/worklog/` entry. Never place
credentials, contracts, raw learner data, session data or secret references in
the worklog or repository.
